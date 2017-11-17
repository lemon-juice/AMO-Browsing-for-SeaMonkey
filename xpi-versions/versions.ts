const viewModel = {
    addon: ko.observable<Addon>(),
    replacements: ko.observableArray<Addon>(),
    versions: ko.observableArray<FlatVersion>(),
    page: ko.observable<number>(),
    last_page: ko.observable<number>(),
    release_notes_shown: ko.observable(false),
    
    prev_page_url: ko.pureComputed(() => ""),
    next_page_url: ko.pureComputed(() => ""),

    prev: () => location.href = viewModel.prev_page_url(),
    next: () => location.href = viewModel.next_page_url(),
    toggle_release_notes: () => viewModel.release_notes_shown(!viewModel.release_notes_shown())
};

viewModel.prev_page_url = ko.pureComputed(() => viewModel.page() > 1
    ? replacePageParam(viewModel.page() - 1)
    : "");
viewModel.next_page_url = ko.pureComputed(() => viewModel.page() < viewModel.last_page()
    ? replacePageParam(viewModel.page() + 1)
    : "");

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

        for(let i = 0; i < addonMinVersion.length; i++) {
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

        for(let i = 0; i < addonMaxVersion.length; i++) {
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

window.onload = async () => {
    const searchParams = new URLSearchParams(location.search.substr(1));
    const host = searchParams.get('host') || "addons.mozilla.org";
    const id = searchParams.get('id');
    const beta = searchParams.get('beta') == "true";
    const page = +(searchParams.get('page') || "1");
    const page_size = +(searchParams.get('page_size') || "10");

    if (id == null) {
        document.getElementById("main")!.innerHTML = "Use the ?id= parameter to specify an add-on, using a slug, GUID, or numeric ID.";
        return;
    }

    ko.applyBindings(viewModel, document.body);

    const addon: Addon = await get_json(`https://${host}/api/v3/addons/addon/${id}?lang=${navigator.language}`);
    viewModel.addon(addon);

    document.title = addon.name + " Version History";

    const versions_response = await get_json(`https://${host}/api/v3/addons/addon/${id}/versions?page=${page}&page_size=${page_size}${beta ? "&filter=only_beta" : ""}&lang=${navigator.language}`);
    viewModel.page(page);
    viewModel.last_page(Math.ceil(versions_response.count / page_size));

    const versions_ext = (versions_response.results as AmoVersion[]).map(v => new FlatVersion(addon, v));
    viewModel.versions(versions_ext);

    if (versions_ext.every(v => v.file.is_webextension)) {
        try {
            const guid = addon.guid;

            for (let page = 1; page <= 10; page++) {
                const replacements = await get_json(`https://${host}/api/v3/addons/replacement-addon/?page=${page}&lang=${navigator.language}`);
                for (let o of replacements.results) {
                    if (o.replacement.indexOf(guid) >= 0) {
                        try {
                            const other_addon = await get_json(`https://${host}/api/v3/addons/addon/${o.guid}?lang=${navigator.language}`);
                            viewModel.replacements.push(other_addon);
                        } catch (e) {
                            console.warn("Could not get addon " + o.guid, e);
                        }
                    }
                }
                if (replacements.next == null) break;
            }
        } catch (e) {
            console.error("Could not query Mozilla recommendation API", e);
        }
    }

    const suite_navbar_links: any = {
        first: viewModel.page() > 1
            ? replacePageParam(1)
            : "",
        prev: viewModel.prev_page_url(),
        next: viewModel.next_page_url(),
        last: viewModel.page() < viewModel.last_page()
            ? replacePageParam(viewModel.last_page())
            : ""
    };
    for (let key in suite_navbar_links) {
        const value = suite_navbar_links[key];
        if (value) {
            const link = document.createElement("link");
            link.rel = key;
            link.href = value;
            document.head.appendChild(link);
        }
    }
};
