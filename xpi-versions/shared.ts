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
