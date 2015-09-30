"use strict";
  
Components.utils.import("resource://gre/modules/Services.jsm");

var amoBr = {
  
  converterURL: 'http://addonconverter.fotokraina.com/',
  
  // Numeric IDs of add-ons that should not be converted due to strict version
  // check and strict version requirements.
  // For these add-ons there will be no convert option offered.
  strictAddOns:[
	2313  // Lightning
  ],
  
  // Numeric IDs of add-ons that work in Firefox without conversion, although
  // they appear Firefox-only at AMO.
  workingFxAddOns:[
	1843  // Firebug
  ],
  
  init: function() {
	amoBr.stringBundle = Services.strings.createBundle('chrome://amobrowsing/locale/global.properties?' + Math.random()); // Randomize URI to work around bug 719376

    addEventListener("DOMContentLoaded", this, false);
	addMessageListener("AMOBrowsing:removeEvents", this);
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
  
  /* Receiving message from addMessageListener */
  receiveMessage: function(aMsg) {
    switch (aMsg.name) {
      case "AMOBrowsing:removeEvents": this.removeEvents(); break;
	}
  },
  
  removeEvents: function() {
	removeEventListener("DOMContentLoaded", this, false);
  },
  
  /* Handle DOMContentLoaded event */
  handleEvent: function(e) {
	if (e.target.defaultView.frameElement) {
	  // don't do anything in frames
	  return;
	}
	
	var url = e.target.defaultView.location.href;
	
	if (url.indexOf('https://addons.mozilla.org/') != 0) {
	  return;
	}
	
	var app = this.getPageApp();
	
	if (app == 'seamonkey') {
	  this.modifySeaMonkeyPage();
	  
	} else if (app == 'firefox') {
	  this.modifyFirefoxPage();
	  
	} else if (this.isListingPage()) {
	  this.modifyListing();
	  this.addSearchResultsObserver();
	}
	
	this.modifyHoverCards();
	
	if (app == 'seamonkey') { // SM add-on page
	  
	  var target = content.document.getElementById('page');
	  
	  if (target) {
		this.addHoverCardObserver(target);
	  }
	}
	
	this.modifyCollectionListing();
  },
  
  /* Modify SeaMonkey add-on page */
  modifySeaMonkeyPage: function() {
	var buttons = content.document.querySelectorAll('p.install-button a.button.add.concealed, p.install-button a.button.contrib.go.concealed');
	var button;
	
	for (var i=0; i<buttons.length; i++) {
	  var b = buttons[i];
	  
	  if (!this.isElementHidden(b)) {
		// visible button
		button = b;
		break;
	  }
	}
	
	if (!button) {
	  return;
	}
	
	button = this.removeEventsFromElem(button);
	button.classList.remove('concealed');
	
	if (!button.classList.contains('caution')) {
	  // fully reviewed (not preliminarily) - add amber bg
	  button.style.background = '#b89b0e linear-gradient(#cec026, #a68d00) repeat scroll 0 0';
	}
	
	var extra = content.document.querySelector('div.install-shell div.extra');
	
	if (!extra) {
	  return;
	}
	
	extra.style.opacity = '0.5';
	
	var label = content.document.createElement('div');
	label.style.margin = '1.5em 0 0.5em';
	label.style.fontSize = '90%';
	label.style.fontStyle = 'italic';
	label.textContent = this.getString('officialStatus');
	extra.insertBefore(label, extra.firstChild);
	
	var alertElem = content.document.createElement('div');
	extra.parentNode.insertBefore(alertElem, extra);
	
	alertElem.style.lineHeight = '1.4';
	alertElem.style.fontWeight = 'bold';
	
	if (this.isContribPage()) {
	  alertElem.style.maxWidth = '400px';
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
	  
	  alertElem.innerHTML = info;
	  alertElem.style.color = 'green';
	  
	} else {
	  // maxVersion is too low and probably strict compatibility is enforced
	  if (addonData.maxVersion) {
		info = amoBr.getString('maxSupportedVer', addonData.maxVersion) + ' ';
	  }
	  
	  var link = this.converterURL + "?url=" + encodeURIComponent(content.location.href) + "&onlyMaxVersion=true";
	  
	  if (this.strictAddOns.indexOf(addonData.addonId) >= 0) {
		info += amoBr.getString('maxSupportedVer_strictForced');
		
	  } else {
		var tagStart = "<a href='" + link + "' style='font-weight: bold; color: darkred; text-decoration: underline;'>";
		var tagEnd = "</a>";
		info += amoBr.getString('maxSupportedVer_strict', [tagStart, tagEnd]);
	  }
	  
	  // grey button:
	  button.style.background = '';
	  button.classList.add('concealed');
	  
	  alertElem.innerHTML = info;
	  alertElem.style.color = 'red';
	}
  },
  
  /* Modify Firefox add-on page */
  modifyFirefoxPage: function() {
	
	// sometimes there may be 3 huge buttons, each for different OS
	var hugeButtons = content.document.querySelectorAll('#addon p.install-button a.button.concealed.CTA');
	
	if (hugeButtons.length == 0) {
	  hugeButtons = content.document.querySelectorAll('#contribution p.install-button a.button.concealed.CTA');
	}
	
	if (hugeButtons.length > 0) {
	  var addOnData = this.getAddonData();
	  
	  for (var i=0; i<hugeButtons.length; i++) {
		var hugeButton = hugeButtons[i];
		
		if (this.isElementHidden(hugeButton)) {
		  // hidden button for other OS
		  continue;
		}
		
		var downloadAnywayButton = content.document.getElementById('downloadAnyway');
		
		if (this.workingFxAddOns.indexOf(addOnData.addonId) >= 0 && downloadAnywayButton) {
		  this.FxPageAddOnIsCompatible(hugeButton, downloadAnywayButton);
		  
		} else {
    	  this.FxPageCheckForSMVersion(hugeButton);
		}
	  }
	}
  },
  
  /* On Fx page - replace huge button with info to check for SM version */
  FxPageCheckForSMVersion: function(hugeButton) {
	hugeButton.classList.remove('concealed');
	hugeButton.classList.remove('CTA');
	hugeButton.style.display = 'inline-block';
	hugeButton.textContent = amoBr.getString('checkForSMVersion');
	hugeButton.href = this.convertURLToSM(content.location.href);
	
	var convertLink = this.converterURL + "?url=" + encodeURIComponent(content.location.href);
	
	var infoElem = content.document.createElement('div');
	infoElem.style.marginBottom = '1em';
	
	if (this.isContribPage()) {
	  infoElem.style.marginTop = '0.5em';
	  infoElem.style.maxWidth = '400px';
	}
	
	var par1 = amoBr.getString('checkForSMVersion_info',
	  ["<a href='" + this.converterURL + "'>", "</a>"]);
	
	var par2 = amoBr.getString('checkForSMVersion_convert',
	  ["<a href='" + convertLink + "'>", "</a>"]);
	
	infoElem.innerHTML = "<p style='font-size: 10pt; text-align: left'>" + par1 + "</p>"
	+ "<p style='font-size: 10pt; text-align: left'>" + par2 + "</p>";
	
	hugeButton.parentNode.appendChild(infoElem);
  },
  
   
  /* On Fx page - replace huge button with info that this add-on works in SM */
  FxPageAddOnIsCompatible: function(hugeButton, downloadAnywayButton) {
	hugeButton.classList.remove('concealed');
	hugeButton.classList.remove('CTA');
	hugeButton.style.display = 'inline-block';
	hugeButton.textContent = "+ " + amoBr.getString('addTOSM');
	hugeButton.href = downloadAnywayButton.href;
	
	var infoElem = content.document.createElement('div');
	infoElem.style.marginBottom = '1em';
	
	if (this.isContribPage()) {
	  infoElem.style.marginTop = '0.5em';
	  infoElem.style.maxWidth = '400px';
	}
	
	infoElem.innerHTML = "<p style='font-size: 10pt; text-align: left; color: green'>" + amoBr.getString('FxAddOnIsCompatible') + "</p>";
	
	hugeButton.parentNode.appendChild(infoElem);
  },

  /* Modify add-on listing page, e.g. "Up & Coming Extensions" */
  modifyListing: function() {
	var items = content.document.querySelectorAll('div.listing div.items > div.item.incompatible');
	
	for (var i=0; i<items.length; i++) {
	  var item = items[i];
	  item.classList.remove('incompatible');
	  
	  var action = item.querySelector('div.action');
	  
	  if (action) {
		var div = content.document.createElement('div');
		div.style.maxWidth = '200px';
		div.style.color = '#999';
		div.style.paddingLeft = '20px';
		div.style.fontSize = '8pt';
		div.style.textAlign = 'center';
		div.style.lineHeight = '1.4';
		div.textContent = amoBr.getString('visitAddOn');
		
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
	  var linkButtons = item.querySelectorAll('p.install-button a.button.concealed.CTA');
	  
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
  
  /* Modify hover cards - mouseover popups with add-ons like those on
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
				&& node.querySelector('#recommendations-grid, #author-addons')) {
			  observer.disconnect();
			  content.setTimeout(amoBr.modifyHoverCards, 0);
			  break mutationsLoop;
			}
		  }
		}
	  }    
	});
	
	observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
  },
  
  removeEventsFromElem: function(elem) {
	var newElem = elem.cloneNode(true);
	elem.parentNode.replaceChild(newElem, elem);
	return newElem;
  },
  
  /* Convert URL of Fx addon page to SM addon page */
  convertURLToSM: function(url) {
	url = url.replace('/firefox/addon/', '/seamonkey/addon/');
	
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
  
  /* Get the name of application of add-on page. NULL if not add-on page. */
  getPageApp: function() {
	var body = content.document.body;
	
	if (!body) {
	  return null;
	}
	
	var isAddonPage = (body.classList.contains('addon-details')
		|| (body.classList.contains('meet')  // also include contribution download page
		    && !body.classList.contains('profile'))
		);
	
	if (!isAddonPage) {
	  return null;
	}
	
	var c = body.classList;
	
	if (c.contains('seamonkey')) {
	  return 'seamonkey';
	}
	
	if (c.contains('firefox')) {
	  return 'firefox';
	}
	
	if (c.contains('thunderbird')) {
	  return 'thunderbird';
	}
	
	if (c.contains('android')) {
	  return 'android';
	}
	
	return null;
  },
  
  /* Check if add-ons listing page is loaded */
  isListingPage: function() {
	var body = content.document.body;
	
	return body && (body.classList.contains('extensions') || body.classList.contains('pjax'));
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
