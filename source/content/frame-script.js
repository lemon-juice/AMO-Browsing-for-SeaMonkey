"use strict";

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

Components.utils.import("resource://gre/modules/Services.jsm");

var newAmoBr = {
  converterURL: 'http://addonconverter.fotokraina.com/',

  /* Get localized string */
  getString: function (name, params) {
    return amoBr.getString(name, params);
  },

  /* Get numeric add-on ID, if present */
  getAddonId: function () {
    const addonDiv = content.document.querySelector('.Addon');
    if (addonDiv) {
      return addonDiv.getAttribute("data-site-identifier");
    }
    return null;
  },

  /* Return a promise that resolves to an object with 1-3 relevant (current or
     past) versions of an add-on. This could be an async function if we only
     wanted to support SeaMonkey 2.49+. */
  getRelevantVersions: (() => {
    // Async function implemented with generators via babel.
    var _ref = _asyncToGenerator(function* (id) {
      // Real function starts here
      var result = {
        newestVersion: null,
        newestSeaMonkeyVersion: null,
        oldLegacyVersionsExist: false
      };

      let url = `/api/v3/addons/addon/${id}/versions`;
      while (url !== null) {
        const resp = yield content.fetch(url);
        const resp_json = yield resp.json();
        for (let version of resp_json.results) {
          if (result.newestVersion == null) {
            result.newestVersion = version;
          }
          // All other versions that use WebExtensions should be ignored.
          if (!version.files.every(f => f.is_webextension)) {
            result.oldLegacyVersionsExist = true;
            // Find the most recent SeaMonkey-compatible version.
            if (version.compatibility.seamonkey) {
              result.newestSeaMonkeyVersion = version;
              return result;
            }
          }
        }
        url = resp_json.next;
      }

      return result;
    });

    return function getRelevantVersions(_x) {
      return _ref.apply(this, arguments);
    };
  })(),

  /* Return a promise that resolves to a list of possible
     legacy alternatives for a WebExtension add-on. This could be an async
     function if we only wanted to support SeaMonkey 2.49+. */
  getReplacementGuids: (() => {
    // Async function implemented with generators via babel.
    var _ref = _asyncToGenerator(function* (id) {
      // Real function starts here
      const addon_resp = yield content.fetch(`/api/v3/addons/addon/${id}`);
      const addon = yield addon_resp.json();
      const guid = addon.guid;

      const list = [];
      
      for (let page = 1; page <= 10; page++) {
        const replacements_resp = yield content.fetch(`/api/v3/addons/replacement-addon/?page=${page}`);
        const replacements_json = yield replacements_resp.json();
        for (let o of replacements_json.results) {
          if (o.replacement.indexOf(guid) >= 0) {
            const other_addon_resp = yield content.fetch(`/api/v3/addons/addon/${o.guid}`);
            const other_addon = yield other_addon_resp.json();
            list.push(other_addon);
          }
        }
        if (replacements_json.next == null) break;
      }

      return list;
    });

    return function getReplacementGuids(_x) {
      return _ref.apply(this, arguments);
    };
  })(),

  dateToString: function (dateStr) {
    return new Date(dateStr).toLocaleDateString([], { year: 'numeric', day: 'numeric', month: 'long' });
  },

  appendLinkToList: function (ul, href, textContent) {
    const li = content.document.createElement('li');
    ul.appendChild(li);
    const a = content.document.createElement('a');
    li.appendChild(a);
    a.href = href;
    a.textContent = textContent;
  },

  /* In SeaMonkey 2.49, this could also be an async function (it would reduce
     some of the nesting.) */
  createAddonInfoDiv: function (id) {
    const div = content.document.createElement('div');
    div.textContent = 'Loading...';

    this.getRelevantVersions(id).then(obj => {
      div.textContent = '';
      // Show the most recent SeaMonkey version, or the most recent version overall if none for SeaMonkey.
      const v = obj.newestSeaMonkeyVersion || obj.newestVersion;
      if (!v.files.every(f => f.is_webextension)) {
        // This is a legacy extension.
        let p = content.document.createElement('p');
        div.appendChild(p);
        p.textContent = this.getString(
          v.compatibility.seamonkey
            ? 'details_newestSeaMonkeyVersion'
            : 'details_newestVersion',
          [v.version, this.dateToString(v.files[0].created)]);

        p.appendChild(content.document.createElement('br'));

        const addlSpan = content.document.createElement('span');
        p.appendChild(addlSpan);

        const ul = content.document.createElement('ul');
        p.appendChild(ul);
        for (let file of v.files) {
          let href, text;
          if (v.compatibility.seamonkey) {
            href = file.url;
            text = this.getString('details_download');
          } else {
            href = this.converterURL + "?url=" + encodeURIComponent(file.url);
            text = this.getString('details_convert');
          }
          if (file.platform != 'all') {
            text += ` (${file.platform})`;
          }
          this.appendLinkToList(ul, href, text);
        }
      } else if (obj.oldLegacyVersionsExist) {
        // The current version uses WebExtensions, but some older versions don't.
        const p = content.document.createElement('p');
        p.textContent = this.getString('details_webExtensions');
        p.textContent += ' ' + this.getString('details_legacyVersionsExist');
        div.appendChild(p);

        const ul = content.document.createElement('ul');
        div.appendChild(ul);
        this.appendLinkToList(
          ul,
          content.location.pathname + 'versions',
          this.getString('details_seeAllVersions'));
      } else {
        // There are no legacy versions of this extension.
        const p1 = content.document.createElement('p');
        p1.textContent = this.getString('details_webExtensions');
        div.appendChild(p1);

        // Get possible replacements.
        const p2 = content.document.createElement('p');
        p2.textContent = this.getString('details_replacementsLoading');
        div.appendChild(p2);

        this.getReplacementGuids(id).then(replacements => {
          if (replacements.length == 0) {
            p2.textContent = '';
          } else {
            p2.textContent = this.getString('details_replacements');

            const ul = content.document.createElement('ul');
            div.appendChild(ul);
            for (let r of replacements) {
              this.appendLinkToList(
                ul,
                r.url,
                r.name[r.default_locale]);
            }
          }
        }).catch(e => {
          content.console.error(e);
          p2.textContent = this.getString('details_error');
        });
      }
    }).catch(e => {
      content.console.error(e);
      div.textContent = this.getString('details_error');
    });

    return div;
  },

  checkMinVersion: function (min) {
    const addonMinVersion = min.split('.');

    const smVersionMatch = /SeaMonkey\/([0-9\.]+)/.exec(content.navigator.userAgent);
    const myVersion = smVersionMatch
      ? smVersionMatch[1].split('.')
      : [Infinity];

    for (let i = 0; i < addonMinVersion.length; i++) {
      const theirMin = addonMinVersion[i] == '*'
        ? 0
        : +addonMinVersion[i];
      const mine = myVersion.length > i
        ? myVersion[i]
        : 0;
      if (theirMin > mine) {
        return false;
      }
    }
    return true;
  },

  checkMaxVersion: function (max) {
    const addonMaxVersion = max.split('.');

    const smVersionMatch = /SeaMonkey\/([0-9\.]+)/.exec(content.navigator.userAgent);
    const myVersion = smVersionMatch
      ? smVersionMatch[1].split('.')
      : [Infinity];

    for (let i = 0; i < addonMaxVersion.length; i++) {
      const theirMax = addonMaxVersion[i] == '*'
        ? Infinity
        : +addonMaxVersion[i];
      const mine = myVersion.length > i
        ? myVersion[i]
        : 0;
      if (theirMax < mine) {
        return false;
      }
    }
    return true;
  },

  modifyNewSite: function () {
    var addonDetails = content.document.querySelector('.Addon-details');

    var newSiteMessage = content.document.createElement("div");
    addonDetails.parentElement.insertBefore(newSiteMessage, addonDetails);

    newSiteMessage.appendChild(this.createAddonInfoDiv(this.getAddonId()));

    for (let elementToHide of [
      content.document.querySelector('div.InstallButton'),
      content.document.querySelector('.AddonCompatibilityError')
    ]) {
      if (elementToHide) elementToHide.style.display = 'none';
    }
  },
}

var amoBr = {
  
  converterURL: 'http://addonconverter.fotokraina.com/',
  
  // Numeric IDs of SeaMonkey add-ons that should not be converted due to strict version
  // check and strict version requirements.
  // For these add-ons the convert option will not be offered.
  strictAddOns:[
    2313  // Lightning
  ],
  
  // Numeric IDs of add-ons that work in SeaMonkey without conversion, although
  // they appear Firefox-only at AMO.
  workingFxAddOns:[
    1843  // Firebug
  ],
  
  init: function() {
    this.stringBundle = Services.strings.createBundle('chrome://amobrowsing/locale/global.properties?' + Math.random()); // Randomize URI to work around bug 719376

    addMessageListener("AMOBrowsing:removeEvents", this);
    this.registerEvents();
  },
  
  /* Get localized string */
  getString: function(name, params) {
    if (!params) {
      return this.stringBundle.GetStringFromName(name);
    }
    
    if (!Array.isArray(params)) {
      params = [params];
    }
    
    return this.stringBundle.formatStringFromName(name, params, params.length);
  },
  
  /* Sanitize html and add it as DOM nodes to parent element.
   * Only text nodes and a few simple elements and attributes will
   * be accepted. Doesn't work with nested elements.
   */
  addSanitizedHtmlASDom: function(parent, html) {
    var parser = new content.DOMParser();
    var body = parser.parseFromString(html, "text/html").body;
    
    for (var i=0; i<body.childNodes.length; i++) {
      var sourceNode = body.childNodes[i];
      
      if (sourceNode.nodeName == '#text') {
        var newNode = content.document.createTextNode(sourceNode.data);
        
      // allow only these HTML tags:
      } else if (sourceNode.nodeName == 'A'
        || sourceNode.nodeName == 'EM'
        || sourceNode.nodeName == 'P'
        || sourceNode.nodeName == 'BR') {
        var newNode = content.document.createElement(sourceNode.nodeName);
        newNode.textContent = sourceNode.textContent;
        
        // allow only these attributes:
        if (sourceNode.getAttribute('href')) {
          newNode.setAttribute('href', sourceNode.getAttribute('href'));
        }
        
        if (sourceNode.getAttribute('style')) {
          newNode.setAttribute('style', sourceNode.getAttribute('style'));
        }
      }
      
      parent.appendChild(newNode);
    }
  },
  
  /* Receiving message from addMessageListener */
  receiveMessage: function(aMsg) {
    switch (aMsg.name) {
      case "AMOBrowsing:removeEvents": this.removeEvents(); break;
    }
  },
  
  registerEvents: function() {
    // start observing link changes after document is created
    this.documentInitObserver = {
        observe: function(aSubject, aTopic, aData) {
          if ("document-element-inserted" == aTopic) {
            amoBr.observeDownloadLinksChanges();
        }
      }
    };
    
    Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService)
      .addObserver(this.documentInitObserver, "document-element-inserted", false);

    
    addEventListener("DOMContentLoaded", this, false);
  },
  
  /* Remove events on add-on shutdown */
  removeEvents: function() {
    removeEventListener("DOMContentLoaded", this, false);
    removeMessageListener("AMOBrowsing:removeEvents", this);
    
    // remove observers
    Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService)
      .removeObserver(this.documentInitObserver, "document-element-inserted");
  },
  
  /* Handle DOMContentLoaded event */
  handleEvent: function(e) {
    if (e.target.defaultView.frameElement // ignore frames
        || !['https://addons.mozilla.org/', 'https://addons-dev.allizom.org/'].some(s => e.target.defaultView.location.href.indexOf(s) == 0)
        || !content.document.body
        ) {
      return;
    }

    /* Handle new version of AMO */
    if (content.document.getElementById('react-view')) {
      newAmoBr.modifyNewSite();
      content.window.addEventListener('popstate', function () {
        newAmoBr.modifyNewSite();
      });
      return;
    }

    /* Delay until AMO scripts have run */
    content.setTimeout(() => {
      //this.displayGrabbedLinks();
      this.addStyleSheet();
      var app = this.detectAppNameForPage();
      
      if (this.isAddonPage()) {
        if (app == 'seamonkey') {
          this.modifySeaMonkeyPage();
          
          var target = content.document.getElementById('page');
          
          if (target) {
            this.addHoverCardObserver(target);
          }
          
        } else if (app == 'firefox') {
          this.modifyFirefoxPage();
          
        } else if (app == 'thunderbird') {
          this.modifyThunderbirdPage();
        }
        
      } else {
        // not add-on page
        if (this.isListingPage()) {
          this.modifyListing();
          this.addSearchResultsObserver();
        
        } else if (this.isVersionsPage()) {
          this.modifyVersionsPage();
        }
        
        this.modifyCollectionListing();
        this.modifyHoverCards();
      }
    }, 0);
  },

  
  /**
   * Watch for AMO scripts trying to replace download links with a link for downloading Fx.
   * This happens on version pages. We save the links to a different attribute, which is used
   * later to put them back in.
   */
  observeDownloadLinksChanges: function() {
    if (!content) {
      // sometimes observer calls this function when content is null (I don't know why)
      return;
    }
    
    //amoBr.grabbedLinks = [];
    
    var observer = new content.MutationObserver(function(mutations) {
      if (content.document.location.host != 'addons.mozilla.org'
          || content.document.location.protocol != 'https:') {
        // quit if not AMO
        return;
      }
      
      mutations.forEach(function(mutation) {
        var target = mutation.target;
        
        if (target.nodeName == 'A'
            && target.classList.contains('download')
            && !target.getAttribute('data-realurl')) {
          target.setAttribute('data-realurl', mutation.oldValue);
          //amoBr.grabbedLinks.push(mutation.oldValue);
        }
      });
    });
    
    var target = content.document;
    observer.observe(target, { childList: false, attributes: true, attributeOldValue: true, subtree: true, attributeFilter: ['href'] });
  },
  
  // for debugging:
  //displayGrabbedLinks: function() {
  //  var wrapper = content.document.createElement('div');
  //  wrapper.innerHTML = this.grabbedLinks.join('<br>\n');
  //  content.document.body.insertBefore(wrapper, content.document.body.firstChild);
  //},
  //
  //appendDebug: function(txt) {
  //  var wrapper = content.document.createElement('div');
  //  wrapper.textContent = txt;
  //  content.document.body.insertBefore(wrapper, content.document.body.firstChild);
  //},
  
  addStyleSheet: function() {
    var link = content.document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', 'chrome://amobrowsing/content/style.css');
    content.document.head.appendChild(link);
  },
  
  /* Modify SeaMonkey add-on page */
  modifySeaMonkeyPage: function() {
    var buttons = content.document.querySelectorAll('p.install-button a.button.add.concealed, p.install-button a.button.contrib.go.concealed');
    if (buttons.length == 0) {
      return;
    }
    
    var button = buttons[0];
    
    button = this.removeEventsFromElem(button);
    content.setTimeout(() => button.classList.remove('concealed'), 0);
    
    if (!button.classList.contains('caution')) {
      // fully reviewed (not preliminarily) add-on - add amber bg
      button.classList.add('amobrowsing-amber');
    }
    
    var extra = content.document.querySelector('div.install-shell div.extra');
    
    if (!extra) {
      return;
    }
    
    extra.style.opacity = '0.6';
    
    var label = content.document.createElement('div');
    label.textContent = this.getString('officialStatus');
    label.className = 'amobrowsing-official-status';
    extra.insertBefore(label, extra.firstChild);
    
    var infoElem = content.document.createElement('div');
    extra.parentNode.insertBefore(infoElem, extra);
    
    infoElem.classList.add('amobrowsing-sm-compat-info');
    
    if (this.isContribPage()) {
      infoElem.style.maxWidth = '400px';
    }
    
    var addonData = this.getAddonData();
    var info = "";
    
    if (addonData.isCompatible) {
      // add-on is compatible, only maxVersion is too low
      var compatibleByDefault = (Services.vc.compare(addonData.maxVersion, '2.1') >= 0);
      
      if (compatibleByDefault) {
        info = amoBr.getString('maxSupportedVer', addonData.maxVersion) + ' '
          + amoBr.getString('maxSupportedVer_workFine');
      
      } else {
        // very old extension - needs conversion
        var link = this.converterURL + "?url=" + encodeURIComponent(content.location.href);
        
        info = amoBr.getString('maxSupportedVer', addonData.maxVersion) + ' '
        + amoBr.getString('maxSupportedVer_needsConversion', ["<a href='" + link + "'>", "</a>"]);
      }
      
      amoBr.addSanitizedHtmlASDom(infoElem, info);
      infoElem.classList.add('compatible');
      
    } else {
      // maxVersion is too low and probably strict compatibility is enforced
      if (addonData.maxVersion) {
        info = amoBr.getString('maxSupportedVer', addonData.maxVersion) + ' ';
      }
      
      var link = this.converterURL + "?url=" + encodeURIComponent(content.location.href) + "&onlyMaxVersion=true";
      
      if (this.strictAddOns.indexOf(addonData.addonId) >= 0) {
        info += amoBr.getString('maxSupportedVer_strictForced');
      
      } else {
        var tagStart = "<a href='" + link + "'>";
        var tagEnd = "</a>";
        info += amoBr.getString('maxSupportedVer_strict', [tagStart, tagEnd]);
      }
      
      // grey button:
      button.style.background = '';
      button.classList.add('concealed');
      
      amoBr.addSanitizedHtmlASDom(infoElem, info);
      infoElem.classList.add('incompatible');
    }
  },
  
  /* Modify Firefox add-on page */
  modifyFirefoxPage: function() {
    
    // sometimes there may be 3 huge buttons, each for different OS
    var hugeButtons = content.document.querySelectorAll('#addon p.install-button a.button.CTA');
    
    if (hugeButtons.length == 0) {
      hugeButtons = content.document.querySelectorAll('#contribution p.install-button a.button.CTA');
    }
    
    if (hugeButtons.length > 0) {
      var addOnData = this.getAddonData();
      var prevHref;
      
      for (var i=0; i<hugeButtons.length; i++) {
        var hugeButton = hugeButtons[i];
        
        if (this.isElementHidden(hugeButton)) {
          // hidden button for other OS
          continue;
        }
        
        if (hugeButton.href === prevHref) {
          // same button repeated - this happens on multi-platform add-on
          // pages (AMO bug) - hide it
          hugeButton.style.setProperty('display', 'none', 'important');
          continue;
        }
        
        prevHref = hugeButton.href;
        var downloadAnywayButton = content.document.getElementById('downloadAnyway');
        
        this.FxPageCheckForSMVersion(hugeButton);
      }
    }
    
    // section with versions below
    hugeButtons = content.document.querySelectorAll('section.primary.island.more-island p.install-button a.button.CTA');
    
    for (var i=0; i<hugeButtons.length; i++) {
      var hugeButton = hugeButtons[i];
      
      if (!this.isElementHidden(hugeButton)) {
        // remove the huge appearance of the button
        hugeButton.classList.remove('CTA');
        
        hugeButton.href = hugeButton.getAttribute('data-realurl');
        hugeButton.textContent = this.getString('download');
      }
    }
    
  },
  
  /* On Fx page - replace huge button with info to check for SM version */
  FxPageCheckForSMVersion: function(hugeButton) {
    hugeButton.style.display = 'none';
    
    var infoElem = content.document.createElement('div');
    infoElem.className = 'amobrowsing-info';
    
    if (this.isContribPage()) {
      infoElem.style.marginTop = '0.5em';
      infoElem.style.maxWidth = '400px';
    }

    const id = +content.document.querySelector('.install').getAttribute('data-addon');
    infoElem.appendChild(newAmoBr.createAddonInfoDiv(id));
    
    hugeButton.parentNode.appendChild(infoElem);
  },
  
  /* Modify Thunderbird add-on page */
  modifyThunderbirdPage: function() {
    var shell = content.document.querySelector('#addon div.install-shell, #contribution div.install-shell');
    
    if (!shell) {
      return;
    }
  
    var infoElem = content.document.createElement('div');
    infoElem.className = 'amobrowsing-info';

    if (this.isContribPage()) {
      infoElem.style.maxWidth = '400px';
      infoElem.style.textAlign = 'left';
    }
    
    var SMLink = this.convertURLToSM(content.location.href);
    var converterLink = this.converterURL;
    var convertLink = this.converterURL + "?url=" + encodeURIComponent(content.location.href);
    
    
    var addonData = this.getAddonData();
    var info = '';
    
    if (this.strictAddOns.indexOf(addonData.addonId) < 0) {
      info = amoBr.getString('TbInfo',
                ["<a href='" + SMLink + "' style='font-weight: bold'>", "</a>",
                 "<a  href='" + converterLink + "'>", "</a>"]) + '<br/><br/>'
              + amoBr.getString('convertAddon',
                ["<a href='" + convertLink + "' style='font-weight: bold'>", "</a>"]);
  
    } else {
      info = amoBr.getString('SmVersionExists',
                ["<a href='" + SMLink + "' style='font-weight: bold'>", "</a>"]);
    }
    
    amoBr.addSanitizedHtmlASDom(infoElem, info);
    shell.appendChild(infoElem);
  },


  /* Modify add-on listing page, e.g. "Up & Coming Extensions" */
  modifyListing: function() {
    // remove huge "only with Firefox" buttons
    var hugeButtons = content.document.querySelectorAll('div.listing div.items p.install-button a.button.CTA');
    
    for (var i=0; i<hugeButtons.length; i++) {
      var item = hugeButtons[i];
      while (item && !item.classList.contains('item')) {
        item = item.parentElement;
      }
      if (!item) continue;
      
      var action = item.querySelector('div.action');
      
      if (action) {
        var div = content.document.createElement('div');
        div.style.maxWidth = '200px';
        div.style.color = '#999';
        div.style.paddingLeft = '20px';
        div.style.fontSize = '8pt';
        div.style.textAlign = 'center';
        div.style.lineHeight = '1.4';
        div.textContent = item.querySelector('.is-webextension')
          ? amoBr.getString('notCompatible')
          : amoBr.getString('visitAddOn');
        
        action.textContent = '';
        action.appendChild(div);
      }
    }
  },
  
  /* Invoke modifyListing() when pagination scripts load new add-on lists with ajax */
  addSearchResultsObserver: function() {
    var target = content.document.getElementById('pjax-results');
    
    if (!target) {
      return;
    }
    
    var observer = new content.MutationObserver(function(mutations) {
      
      for (var m=0; m<mutations.length; m++) {
        var mutation = mutations[m];
        
        if (mutation.type == 'childList') {
          content.setTimeout(amoBr.modifyListing, 0);
          break;
        }
      }    
    });
    
    observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: false });
  },
    
  modifyCollectionListing: function() {
    var items = content.document.querySelectorAll('div.primary div.separated-listing div.item');
    
    for (var i=0; i<items.length; i++) {
      var item = items[i];
      var link = item.querySelector('h3 a');
      var linkButtons = item.querySelectorAll('p.install-button a.button.CTA');
      
      if (!link) {
        continue;
      }
      
      if (linkButtons.length > 0) {
        for (var j=0; j<linkButtons.length; j++) {
          var linkButton = linkButtons[j];
          
          if (this.isElementHidden(linkButton)) {
            linkButton.style.display = 'none';
            continue;
          }
          
          // replace "Only with Firefox — Get Firefox Now!"
          linkButton.textContent = amoBr.getString('checkForSMVersion');
          linkButton.href = this.convertURLToSM(link.href);
          linkButton.style.whiteSpace = 'normal';
        }
        
        // this prevents the link from being disabled by AMO scripts
        linkButtons[0].parentNode.classList.remove('install-button');
      
      } else if (item.querySelector('div.install-shell div[data-version-supported=false]')) {
        // version unsupported according to AMO
        var span = item.querySelector('div.install-shell span.notavail');
        
        if (span) {
          span.style.background = 'none';
          span.style.paddingLeft = '0';
          span.style.fontWeight = 'normal';
          span.style.whiteSpace = 'normal';
          span.textContent = amoBr.getString('visitAddOn');
          span.parentNode.style.lineHeight = '1.3';
        }
      }
      
      // fix AMO bug - "Continue to Download" for contribution add-ons is blocked
      // by scripts
      var linkButtons = item.querySelectorAll('p.install-button a.button.contrib.go');
      
      if (linkButtons.length > 0) {
        
        for (var j=0; j<linkButtons.length; j++) {
          var linkButton = linkButtons[j];
          
          if (this.isElementHidden(linkButton)) {
          linkButton.style.display = 'none';
          continue;
          }
        }
        
        // this prevents the link from being disabled by AMO scripts
        linkButtons[0].parentNode.classList.remove('install-button');
      
      } else {
        var linkButtons = item.querySelectorAll('p.install-button a.button.download');
        
        if (linkButtons.length > 0) {
          // replace green "Download Now" buttons that are disabled anyway
          var removeBlock = false;
          
          for (var j=0; j<linkButtons.length; j++) {
            var linkButton = linkButtons[j];
            
            if (linkButton.classList.length != 2) {
              continue;
            }
            
            removeBlock = true;
            
            if (this.isElementHidden(linkButton)) {
              linkButton.style.display = 'none';
              continue;
            }
            
            linkButton.textContent = amoBr.getString('checkForSMVersion');
            linkButton.href = this.convertURLToSM(link.href);
            linkButton.style.whiteSpace = 'normal';
            linkButton.classList.add('concealed');
          }
          
          if (removeBlock) {
            // this prevents the link from being disabled by AMO scripts
            linkButtons[0].parentNode.classList.remove('install-button');
          }
        }
      }
    }
  },
  
  /* Modify hover cards - mouse over popups with add-ons like those on
   * AMO home page
   */
  modifyHoverCards: function() {
    var hcards = content.document.querySelectorAll('div.addon.hovercard');
    
    for (var i=0; i<hcards.length; i++) {
      var hcard = hcards[i];
      
      if (hcard.querySelector('div.install-shell div[data-version-supported=false]')) {
        // version unsupported according to AMO
        var span = hcard.querySelector('div.install-shell span.notavail');
        
        if (span) {
          span.style.color = '#888';
          span.style.lineHeight = '1.3';
          span.style.margin = '-20px 0 5px 0';
          span.textContent = amoBr.getString('visitAddOn');
        }
      }
    }
  },
  
  modifyVersionsPage: function() {
    // remove buttons for non-SM compatible addons that say "Download Now" instead of "Add to SeaMonkey"
    var buttons = content.document.querySelectorAll('div.listing div.items p.install-button a.button.download');
    
    for (var i=0; i<buttons.length; i++) {
      var item = buttons[i];
      while (item && !item.classList.contains('item')) {
        item = item.parentElement;
      }
      if (!item) continue;
      
      var action = item.querySelector('div.action');
      
      if (action) {
        var div = content.document.createElement('div');
        div.style.display = 'inline-block';
        div.style.maxWidth = '170px';
        div.style.color = '#999';
        div.style.fontSize = '8pt';
        div.style.textAlign = 'center';
        div.style.lineHeight = '1.4';
        amoBr.addSanitizedHtmlASDom(div, amoBr.getString('notCompatible'));
      
        var compat = item.querySelector('span.meta.compat');
        if (compat) {
          // Parse the compatibility string to figure out if this uses WebExtensions or not
          var match = /Firefox.*- ?([0-9]+)/.exec(compat.innerText);
          if (match) {
            var maxVer = +match[1];
            if (maxVer <= 56) {
              var xpiURL = buttons[i].href;

              var downloadAnywayLink = item.querySelector('.download-anyway a');
              if (downloadAnywayLink) {
                xpiURL = downloadAnywayLink.href;
              }

              var convertLink = this.converterURL + "?url=" + encodeURIComponent(xpiURL);
              div.textContent = "";
              amoBr.addSanitizedHtmlASDom(div, amoBr.getString('convertAddon',
                ["<a href='" + convertLink + "' style='font-weight: bold'>", "</a>"]));
            }
          }
        }
        
        action.textContent = '';
        action.appendChild(div);
      }
    }
  },
  
  /* Invoke modifyHoverCards() when "Often used with..." and "Other add-ons by these authors"
   * panels are injected into page by AMO ajax
   */
  addHoverCardObserver: function(target) {
    var observer = new content.MutationObserver(function(mutations) {
      
      mutationsLoop:
      for (var m=0; m<mutations.length; m++) {
        var mutation = mutations[m];
        
        if (mutation.type == 'childList') {
          
          for (var i=0; i<mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            
            if (node.nodeName == 'SECTION'
              && node.classList.contains('primary')
              && node.querySelector('#recommendations-grid, #author-addons, #beta-channel, div.version.item')) {
              observer.disconnect();
              content.setTimeout(function() {
                amoBr.modifyHoverCards();
                amoBr.modifyDevelopmentChannelAndVerInfo();
              }, 0);
              break mutationsLoop;
            }
          }
        }
      }  
    });
    
    observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  },
  
  /* Unblock download button in Development Channel and Version Information */
  modifyDevelopmentChannelAndVerInfo: function() {
    var buttons = content.document.querySelectorAll('#install-beta p.install-button a.button.caution.add.concealed, #detail-relnotes p.install-button a.button.caution.add.concealed');
    
    for (var i=0; i<buttons.length; i++) {
      var button = buttons[i];
      
      if (!amoBr.isElementHidden(button)) {
        // this makes the button clickable
        button.classList.remove('caution');
      }
    }
  },
  
  removeEventsFromElem: function(elem) {
    var newElem = elem.cloneNode(true);
    elem.parentNode.replaceChild(newElem, elem);
    return newElem;
  },
  
  /* Convert URL of Fx or TB addon page to SM addon page */
  convertURLToSM: function(url) {
    url = url.replace(/\/(firefox|thunderbird)\/addon\//, '/seamonkey/addon/');
    
    var pos = url.indexOf('/contribute/roadblock/');
    
    if (pos > 0) {
      // this is URL of contribution page - change to main addon page
      url = url.substr(0, pos + 1);
    }
    
    return url;
  },
  
  /* Get add-on data from certain elements on page */
  getAddonData: function() {
    var dataElem = content.document.querySelector('div.install-shell div.install');
    
    if (!dataElem) {
      return {};
    }
    
    var data = {};
    
    data.isCompatible = (dataElem.getAttribute('data-is-compatible') == 'true');
    data.maxVersion = dataElem.getAttribute('data-max');
    data.addonId = parseInt(dataElem.getAttribute('data-addon'), 10);
    
    return data;
  },
  
  /* Check if this is add-on page. */
  isAddonPage: function() {
    var body = content.document.body;
    
    var isAddonPage = (body.classList.contains('addon-details')
      || (body.classList.contains('meet')  // also include contribution download page
          && !body.classList.contains('profile'))
      );

    return isAddonPage;
  },
  
  /* Check if this is add-on's versions page. */
  isVersionsPage: function() {
    return content.document.body.classList.contains('versions');
  },
  
  /* Get the name of application for current AMO page. */
  detectAppNameForPage: function() {
    var c = content.document.body.classList;
    
    if (c.contains('seamonkey')) {
      return 'seamonkey';
    }
    
    if (c.contains('firefox')) {
      return 'firefox';
    }
    
    if (c.contains('thunderbird')) {
      return 'thunderbird';
    }

    return null;
  },
  
  /* Check if add-ons listing page is loaded */
  isListingPage: function() {
    var body = content.document.body;
    return (body.classList.contains('extensions') || body.classList.contains('pjax'));
  },
  
  /* Check if this is contribution page with download link */
  isContribPage: function() {
    return content.document.getElementById('contribution') && content.document.body.classList.contains('meet');
  },
  
  isElementHidden: function(elem) {
    var display = content.getComputedStyle(elem, '').getPropertyValue('display');
    return (display == 'none' || elem.getAttribute('hidden'));
  }
}

amoBr.init();
