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
function replacePageParam(page) {
    var searchParams = new URLSearchParams(location.search.substr(1));
    searchParams.set("page", "" + page);
    return location.protocol + "//" + location.host + location.pathname + "?" + searchParams;
}
var viewModel = {
    addon: ko.observable(),
    replacements: ko.observableArray(),
    versions: ko.observableArray(),
    page: ko.observable(),
    last_page: ko.observable(),
    release_notes_shown: ko.observable(false),
    prev_page_url: ko.pureComputed(function () { return ""; }),
    next_page_url: ko.pureComputed(function () { return ""; }),
    prev: function () { return location.href = viewModel.prev_page_url(); },
    next: function () { return location.href = viewModel.next_page_url(); },
    toggle_release_notes: function () { return viewModel.release_notes_shown(!viewModel.release_notes_shown()); }
};
viewModel.prev_page_url = ko.pureComputed(function () { return viewModel.page() > 1
    ? replacePageParam(viewModel.page() - 1)
    : ""; });
viewModel.next_page_url = ko.pureComputed(function () { return viewModel.page() < viewModel.last_page()
    ? replacePageParam(viewModel.page() + 1)
    : ""; });
var platform = (function () {
    var platform = null;
    var osStrings = {
        'windows': /Windows/,
        'mac': /Mac/,
        'linux': /Linux|BSD/,
        'android': /Android/,
    };
    for (var i in osStrings) {
        var pattern = osStrings[i];
        if (pattern.test(navigator.userAgent)) {
            platform = i;
            break;
        }
    }
    return platform;
})();
var FlatVersion = /** @class */ (function () {
    function FlatVersion(addon, version) {
        var _this = this;
        this.addon = addon;
        this.version = version;
        this.file = version.files.filter(function (f) { return f.platform == platform || f.platform == "all"; }).concat(version.files)[0];
        this.strict = addon.type == "language" // All language packs
            || addon.id == 2313; // Lightning
        var xpi_url = this.file.url.replace(/src=$/, "src=version-history");
        this.install_url = xpi_url;
        this.download_url = xpi_url.replace(/downloads\/file\/([0-9]+)/, "downloads/file/$1/type:attachment");
        this.released_display = new Date(this.file.created).toLocaleDateString(navigator.language, {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        this.compatibility_display = ko.pureComputed(function () {
            var compatiblityStrs = [];
            // Get compatibility information for Mozilla-related applications from AMO.
            // An add-on won't be listed unless it has at least one of these.
            var applications_by_name = {
                firefox: "Firefox",
                android: "Firefox for Android",
                thunderbird: "Thunderbird",
                seamonkey: "SeaMonkey"
            };
            // See which Mozilla applications this works with
            for (var id in applications_by_name) {
                var c = _this.version.compatibility[id];
                if (!c)
                    continue;
                var name_1 = applications_by_name[id] || id;
                compatiblityStrs.push(name_1 + " " + c.min + " - " + c.max);
            }
            return compatiblityStrs.join(", ");
        });
        this.app_compatible = ko.pureComputed(function () {
            if (addon.type == "dictionary")
                return true;
            if (addon.type == "persona")
                return true;
            if (addon.type == "search")
                return "AddSearchProvider" in window.external;
            var amo_compat = _this.version.compatibility["seamonkey"];
            if (!amo_compat)
                return false; // Not compatible
            if (!FlatVersion.checkMinVersion(amo_compat.min))
                return false; // Only supports newer versions
            if (_this.strict) {
                if (!FlatVersion.checkMaxVersion(amo_compat.max))
                    return false; // Only supports older versions
            }
            if (_this.file.is_webextension)
                return false; // No WebExtensions support
            return true;
        });
        this.converter_url = "https://addonconverter.fotokraina.com/?url=" + encodeURIComponent(xpi_url);
        this.convertible = ko.pureComputed(function () {
            if (_this.addon.type != "extension")
                return false;
            if (_this.app_compatible())
                return false;
            if (_this.strict)
                return false;
            return !_this.file.is_webextension;
        });
    }
    FlatVersion.prototype.addSearchProvider = function () {
        window.external.AddSearchProvider(this.install_url);
    };
    FlatVersion.getAppVersion = function () {
        var versionMatch = /SeaMonkey\/([0-9\.]+)/.exec(navigator.userAgent);
        return versionMatch ? versionMatch[1] : "999";
    };
    FlatVersion.checkMinVersion = function (min) {
        var addonMinVersion = min.split('.');
        var myVersion = this.getAppVersion().split('.');
        for (var i = 0; i < addonMinVersion.length; i++) {
            var theirMin = addonMinVersion[i] == '*'
                ? 0
                : +addonMinVersion[i];
            var mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMin < mine) {
                return true;
            }
            else if (theirMin > mine) {
                return false;
            }
        }
        return true;
    };
    FlatVersion.checkMaxVersion = function (max) {
        var addonMaxVersion = max.split('.');
        var myVersion = this.getAppVersion().split('.');
        for (var i = 0; i < addonMaxVersion.length; i++) {
            var theirMax = addonMaxVersion[i] == '*'
                ? Infinity
                : +addonMaxVersion[i];
            var mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMax > mine) {
                return true;
            }
            else if (theirMax < mine) {
                return false;
            }
        }
        return true;
    };
    return FlatVersion;
}());
function get_json(url) {
    return __awaiter(this, void 0, void 0, function () {
        var response, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, fetch(url)];
                case 1:
                    response = _c.sent();
                    if (!(response.status >= 400)) return [3 /*break*/, 3];
                    _a = Error.bind;
                    _b = url + " returned status code " + response.status + ": ";
                    return [4 /*yield*/, response.text()];
                case 2: throw new (_a.apply(Error, [void 0, _b + (_c.sent())]))();
                case 3: return [2 /*return*/, response.json()];
            }
        });
    });
}
window.onload = function () { return __awaiter(_this, void 0, void 0, function () {
    var searchParams, host, id, page, page_size, search_results, addon, versions_response, versions_ext, guid, page_1, replacements, _i, _a, o, other_addon, e_1, e_2, suite_navbar_links, key, value, link;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                searchParams = new URLSearchParams(location.search.substr(1));
                host = searchParams.get('host') || "addons.mozilla.org";
                id = searchParams.get('id');
                page = +(searchParams.get('page') || "1");
                page_size = +(searchParams.get('page_size') || "10");
                if (id == null) {
                    document.getElementById("main").innerHTML = "Use the ?id= parameter to specify an add-on, using a slug, GUID, or numeric ID.";
                    return [2 /*return*/];
                }
                ko.applyBindings(viewModel, document.body);
                if (!(id == "random")) return [3 /*break*/, 2];
                return [4 /*yield*/, get_json("https://" + host + "/api/v3/addons/search?lang=" + navigator.language + "&page_size=1&sort=random&type=extension&featured=true")];
            case 1:
                search_results = _b.sent();
                id = search_results.results[0].id;
                _b.label = 2;
            case 2: return [4 /*yield*/, get_json("https://" + host + "/api/v3/addons/addon/" + id + "?lang=" + navigator.language)];
            case 3:
                addon = _b.sent();
                viewModel.addon(addon);
                document.title = addon.name + " Version History";
                return [4 /*yield*/, get_json("https://" + host + "/api/v3/addons/addon/" + id + "/versions?page=" + page + "&page_size=" + page_size + "&lang=" + navigator.language)];
            case 4:
                versions_response = _b.sent();
                viewModel.page(page);
                viewModel.last_page(Math.ceil(versions_response.count / page_size));
                versions_ext = versions_response.results.map(function (v) { return new FlatVersion(addon, v); });
                viewModel.versions(versions_ext);
                if (!versions_ext.every(function (v) { return v.file.is_webextension; })) return [3 /*break*/, 17];
                _b.label = 5;
            case 5:
                _b.trys.push([5, 16, , 17]);
                guid = addon.guid;
                page_1 = 1;
                _b.label = 6;
            case 6:
                if (!(page_1 <= 10)) return [3 /*break*/, 15];
                return [4 /*yield*/, get_json("https://" + host + "/api/v3/addons/replacement-addon/?page=" + page_1 + "&lang=" + navigator.language)];
            case 7:
                replacements = _b.sent();
                _i = 0, _a = replacements.results;
                _b.label = 8;
            case 8:
                if (!(_i < _a.length)) return [3 /*break*/, 13];
                o = _a[_i];
                if (!(o.replacement.indexOf(guid) >= 0)) return [3 /*break*/, 12];
                _b.label = 9;
            case 9:
                _b.trys.push([9, 11, , 12]);
                return [4 /*yield*/, get_json("https://" + host + "/api/v3/addons/addon/" + o.guid + "?lang=" + navigator.language)];
            case 10:
                other_addon = _b.sent();
                viewModel.replacements.push(other_addon);
                return [3 /*break*/, 12];
            case 11:
                e_1 = _b.sent();
                console.warn("Could not get addon " + o.guid, e_1);
                return [3 /*break*/, 12];
            case 12:
                _i++;
                return [3 /*break*/, 8];
            case 13:
                if (replacements.next == null)
                    return [3 /*break*/, 15];
                _b.label = 14;
            case 14:
                page_1++;
                return [3 /*break*/, 6];
            case 15: return [3 /*break*/, 17];
            case 16:
                e_2 = _b.sent();
                console.error("Could not query Mozilla recommendation API", e_2);
                return [3 /*break*/, 17];
            case 17:
                suite_navbar_links = {
                    first: viewModel.page() > 1
                        ? replacePageParam(1)
                        : "",
                    prev: viewModel.prev_page_url(),
                    next: viewModel.next_page_url(),
                    last: viewModel.page() < viewModel.last_page()
                        ? replacePageParam(viewModel.last_page())
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
//# sourceMappingURL=app.js.map