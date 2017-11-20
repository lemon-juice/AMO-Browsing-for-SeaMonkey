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
function replacePageParam(page) {
    var searchParams = new URLSearchParams(location.search.substr(1));
    searchParams.set("page", "" + page);
    return location.protocol + "//" + location.host + location.pathname + "?" + searchParams;
}
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
        this.installable = ko.pureComputed(function () { return _this.app_compatible() || !/SeaMonkey/.test(navigator.userAgent); });
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
//# sourceMappingURL=shared.js.map