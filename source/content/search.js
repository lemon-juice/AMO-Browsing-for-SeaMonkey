var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var searchModel = {
    addons: ko.observableArray(),
    page: ko.observable(),
    last_page: ko.observable(),
    type: ko.observable(),
    sort: ko.observable(),
    q: ko.observable(),
    prev_page_url: ko.pureComputed(function () { return ""; }),
    next_page_url: ko.pureComputed(function () { return ""; }),
    prev: function () { return location.href = searchModel.prev_page_url(); },
    next: function () { return location.href = searchModel.next_page_url(); }
};
searchModel.prev_page_url = ko.pureComputed(function () { return searchModel.page() > 1
    ? replacePageParam(searchModel.page() - 1)
    : ""; });
searchModel.next_page_url = ko.pureComputed(function () { return searchModel.page() < searchModel.last_page()
    ? replacePageParam(searchModel.page() + 1)
    : ""; });
window.onload = function () { return __awaiter(_this, void 0, void 0, function () {
    var searchParams, host, type, sort, q, page, page_size, addons_response, addons, suite_navbar_links, key, value, link;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                searchParams = new URLSearchParams(location.search.substr(1));
                host = searchParams.get('host') || "addons.mozilla.org";
                type = searchParams.get('type') || "extension";
                sort = searchParams.get('sort') || "relevance";
                q = searchParams.get('q');
                page = +(searchParams.get('page') || "1");
                page_size = +(searchParams.get('page_size') || "10");
                ko.applyBindings(searchModel, document.body);
                searchModel.type(type);
                searchModel.sort(sort);
                searchModel.q(q);
                if (!q)
                    return [2 /*return*/];
                return [4 /*yield*/, get_json("https://" + host + "/api/v3/addons/search?q=" + encodeURIComponent(q) + "&type=" + type + "&sort=" + sort + "&page=" + page + "&page_size=" + page_size + "&lang=" + navigator.language)];
            case 1:
                addons_response = _a.sent();
                searchModel.page(page);
                searchModel.last_page(Math.ceil(addons_response.count / page_size));
                addons = addons_response.results;
                searchModel.addons(addons);
                suite_navbar_links = {
                    first: searchModel.page() > 1
                        ? replacePageParam(1)
                        : "",
                    prev: searchModel.prev_page_url(),
                    next: searchModel.next_page_url(),
                    last: searchModel.page() < searchModel.last_page()
                        ? replacePageParam(searchModel.last_page())
                        : ""
                };
                for (key in suite_navbar_links) {
                    value = suite_navbar_links[key];
                    if (value) {
                        link = document.createElement("link");
                        link.rel = key;
                        link.href = value;
                        document.head.appendChild(link);
                    }
                }
                return [2 /*return*/];
        }
    });
}); };
//# sourceMappingURL=search.js.map