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
    next: () => location.href = viewModel.next_page_url()
};

viewModel.prev_page_url = ko.pureComputed(() => viewModel.page() > 1
    ? replacePageParam(viewModel.page() - 1)
    : "");
viewModel.next_page_url = ko.pureComputed(() => viewModel.page() < viewModel.last_page()
    ? replacePageParam(viewModel.page() + 1)
    : "");

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
