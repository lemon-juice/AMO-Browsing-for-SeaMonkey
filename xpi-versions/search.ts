const searchModel = {
    addons: ko.observableArray<FlatVersion>(),
    page: ko.observable<number>(),
    last_page: ko.observable<number>(),

    host: ko.observable<string>(),
    type: ko.observable<string>(),
    sort: ko.observable<string>(),
    app: ko.observable<string>(),
    q: ko.observable<string>(),

    prev_page_url: ko.pureComputed(() => ""),
    next_page_url: ko.pureComputed(() => ""),

    prev: () => location.href = searchModel.prev_page_url(),
    next: () => location.href = searchModel.next_page_url()
};

searchModel.prev_page_url = ko.pureComputed(() => searchModel.page() > 1
    ? replacePageParam(searchModel.page() - 1)
    : "");
searchModel.next_page_url = ko.pureComputed(() => searchModel.page() < searchModel.last_page()
    ? replacePageParam(searchModel.page() + 1)
    : "");

window.onload = async () => {
    const searchParams = new URLSearchParams(location.search.substr(1));
    const host = searchParams.get('host') || "addons.mozilla.org";
    const type = searchParams.get('type') || "extension";
    const sort = searchParams.get('sort') || "relevance";
    const app = searchParams.get('app') || "";
    const q = searchParams.get('q');
    const page = +(searchParams.get('page') || "1");
    const page_size = +(searchParams.get('page_size') || "10");

    ko.applyBindings(searchModel, document.body);

    searchModel.host(host);
    searchModel.type(type);
    searchModel.sort(sort);
    searchModel.app(app);
    searchModel.q(q);

    const form = document.getElementById("search-form");
    if (form instanceof HTMLFormElement) {
        form.addEventListener("submit", e => {
            e.preventDefault();
            location.href = location.href.substring(0, `${location.href}?`.indexOf("?"))
                + `?q=${encodeURIComponent(searchModel.q())}&host=${encodeURIComponent(searchModel.host())}`
                + `&type=${searchModel.type()}&sort=${searchModel.sort()}&app=${searchModel.app()}`;
        });
    }

    if (!q) return;

    let url = `https://${host}/api/v3/addons/search?q=${encodeURIComponent(q)}&type=${type}&sort=${sort}&page=${page}&page_size=${page_size}&lang=${navigator.language}`;
    if (app) url += `&app=${encodeURIComponent(app)}`;

    const addons_response = await get_json(url);
    searchModel.page(page);
    searchModel.last_page(Math.ceil(addons_response.count / page_size));

    const addons = (addons_response.results as Addon[]).map(a => new FlatVersion(a, a.current_version));
    searchModel.addons(addons);

    const suite_navbar_links: any = {
        first: searchModel.page() > 1
            ? replacePageParam(1)
            : "",
        prev: searchModel.prev_page_url(),
        next: searchModel.next_page_url(),
        last: searchModel.page() < searchModel.last_page()
            ? replacePageParam(searchModel.last_page())
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
