function replacePageParam(page: number) {
    const searchParams = new URLSearchParams(location.search.substr(1));
    searchParams.set("page", `${page}`);
    return `${location.protocol}//${location.host}${location.pathname}?${searchParams}`;
}

async function get_json(url: string) {
    const response = await fetch(url);
    if (response.status >= 400) {
        throw new Error(`${url} returned status code ${response.status}: ${await response.text()}`);
    }
    return response.json();
}

interface Addon {
    id: number;
    current_version: AmoVersion;
    guid: string;
    name: string;
    type: "theme" | "search" | "persona" | "language" | "extension" | "dictionary";
    url: string;
}

interface AmoVersion {
    id: number;
    compatibility: {
        [key: string]: undefined | {
            min: string;
            max: string;
        }
    };
    files: AmoFile[];
    is_strict_compatibility_enabled: boolean;
    license: {
        id: number;
        name: string;
        text: string;
        url: string;
    };
    release_notes: string | null;
    url: string;
    version: string;
}

interface AmoFile {
    id: number;
    created: string;
    is_restart_required: boolean;
    is_webextension: boolean;
    platform: string;
    size: number;
    status: string;
    url: string;
}

const platform = (() => {
    let platform: string | null = null;
    const osStrings: any = {
        'windows': /Windows/,
        'mac': /Mac/,
        'linux': /Linux|BSD/,
        'android': /Android/,
    };
    for (const i in osStrings) {
        const pattern = osStrings[i];
        if (pattern.test(navigator.userAgent)) {
            platform = i;
            break;
        }
    }
    return platform;
})();

class FlatVersion {
    readonly file: AmoFile;
    readonly strict: boolean;

    readonly install_url: string;
    readonly download_url: string;
    readonly released_display: string;

    readonly compatibility_display: KnockoutComputed<string>;

    readonly app_compatible: KnockoutComputed<boolean>;

    readonly converter_url: string;
    readonly convertible: KnockoutComputed<boolean>;

    constructor(readonly addon: Addon, readonly version: AmoVersion) {
        this.file = [
            ...version.files.filter(f => f.platform == platform || f.platform == "all"),
            ...version.files
        ][0];
        this.strict = addon.type == "language" // All language packs
            || addon.id == 2313; // Lightning

        const xpi_url = this.file.url.replace(/src=$/, "src=version-history");
        this.install_url = xpi_url;
        this.download_url = xpi_url.replace(/downloads\/file\/([0-9]+)/, "downloads/file/$1/type:attachment");

        this.released_display = new Date(this.file.created).toLocaleDateString(navigator.language, {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        this.compatibility_display = ko.pureComputed(() => {
            let compatiblityStrs: string[] = [];

            // Get compatibility information for Mozilla-related applications from AMO.
            // An add-on won't be listed unless it has at least one of these.
            const applications_by_name: {
                [key: string]: string | undefined
            } = {
                    firefox: "Firefox",
                    android: "Firefox for Android",
                    thunderbird: "Thunderbird",
                    seamonkey: "SeaMonkey"
                };

            // See which Mozilla applications this works with
            for (let id in applications_by_name) {
                const c = this.version.compatibility[id];
                if (!c) continue;

                const name = applications_by_name[id] || id;
                compatiblityStrs.push(`${name} ${c.min} - ${c.max}`);
            }

            return compatiblityStrs.join(", ");
        });

        this.app_compatible = ko.pureComputed(() => {
            if (addon.type == "dictionary") return true;
            if (addon.type == "persona") return true;
            if (addon.type == "search") return "AddSearchProvider" in window.external;

            const amo_compat = this.version.compatibility["seamonkey"];
            if (!amo_compat) return false; // Not compatible
            if (!FlatVersion.checkMinVersion(amo_compat.min)) return false; // Only supports newer versions
            if (this.strict) {
                if (!FlatVersion.checkMaxVersion(amo_compat.max)) return false; // Only supports older versions
            }
            if (this.file.is_webextension) return false; // No WebExtensions support

            return true;
        });

        this.converter_url = `https://addonconverter.fotokraina.com/?url=${encodeURIComponent(xpi_url)}`;
        this.convertible = ko.pureComputed(() => {
            if (this.addon.type != "extension") return false;

            if (this.app_compatible()) return false;
            if (this.strict) return false;

            return !this.file.is_webextension;
        });
    }

    addSearchProvider() {
        (window.external as any).AddSearchProvider(this.install_url);
    }

    private static getAppVersion(): string {
        const versionMatch = /SeaMonkey\/([0-9\.]+)/.exec(navigator.userAgent);
        return versionMatch ? versionMatch[1] : "999";
    }

    private static checkMinVersion(min: string) {
        const addonMinVersion = min.split('.');

        const myVersion = this.getAppVersion().split('.');

        for (let i = 0; i < addonMinVersion.length; i++) {
            const theirMin = addonMinVersion[i] == '*'
                ? 0
                : +addonMinVersion[i];
            const mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMin < mine) {
                return true;
            } else if (theirMin > mine) {
                return false;
            }
        }
        return true;
    }

    private static checkMaxVersion(max: string) {
        const addonMaxVersion = max.split('.');

        const myVersion = this.getAppVersion().split('.');

        for (let i = 0; i < addonMaxVersion.length; i++) {
            const theirMax = addonMaxVersion[i] == '*'
                ? Infinity
                : +addonMaxVersion[i];
            const mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMax > mine) {
                return true;
            } else if (theirMax < mine) {
                return false;
            }
        }
        return true;
    }
}
