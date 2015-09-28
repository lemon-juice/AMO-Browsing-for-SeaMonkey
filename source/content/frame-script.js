"use strict";
  

var amoBr = {
  
  init: function() {
	amoBr.converterURL = 'http://addonconverter.fotokraina.com/';
    addEventListener("DOMContentLoaded", this, false);
	addMessageListener("AMOBrowsing:removeEvents", this);
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
  
  /* Handle mouse event */
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
	}
	
	this.modifyHoverCards();
  },
  
  /* Modify SeaMonkey add-on page */
  modifySeaMonkeyPage: function() {
	var buttons = content.document.querySelectorAll('p.install-button a.button.add.concealed');
	var button;
	
	for (var i=0; i<buttons.length; i++) {
	  var b = buttons[i];
	  
	  var display = content.getComputedStyle(b, '').getPropertyValue('display');
	  
	  if (display != 'none') {
		// visible button
		button = b;
		break;
	  }
	}
	
	if (button) {
	  button = this.removeEventsFromElem(button);
	  button.classList.remove('concealed');
	  
	  if (!button.classList.contains('caution')) {
		// not preliminarily reviewed
		button.style.background = '#b89b0e linear-gradient(#cec026, #a68d00) repeat scroll 0 0';
	  }
	  
	  var compatData = this.getCompatData();
	  var alertElem = content.document.querySelector('div.extra span.notavail');
	  
	  if (alertElem) {
		alertElem.style.background = 'none';
		alertElem.style.whiteSpace = 'normal';
		alertElem.style.paddingLeft = '0';
		alertElem.style.lineHeight = '1.4';
	  }
	  
	  var info = "";
	  
	  if (compatData.isCompatible) {
		// add-on is compatible, only maxVersion is too low
		if (compatData.maxVersion) {
		  info = "Maximum officially supported SeaMonkey version for this add-on is " + compatData.maxVersion + ". "
		  + "However, it is very likely it will work fine also in newer SeaMonkey versions.";
		  
		}
		
		if (alertElem) {
		  alertElem.textContent = info;
		  alertElem.style.color = 'green';
		}
		
	  } else {
		// maxVersion is too low and probably strict compatibility is enforced
		if (compatData.maxVersion) {
		  info = "Maximum officially supported SeaMonkey version for this add-on is " + compatData.maxVersion + ". ";
		}
		
		var link = this.converterURL + "?url=" + encodeURIComponent(content.location.href) + "&onlyMaxVersion=true";
		
		info += "It will probably not install because the author opted for strict version compatibility check. You can try using the Add-on Converter to bump the maxVersion and see if the add-on will work. <a href='" + link + "' style='font-weight: bold; color: darkred; text-decoration: underline;'>Click here</a> to convert this add-on.";
		
		if (alertElem) {
		  alertElem.innerHTML = info;
		  alertElem.style.color = 'red';
		}
	  }
	  
	}
  },
  
  /* Modify Firefox add-on page */
  modifyFirefoxPage: function() {
	var isContribPage = false;
	
	// sometimes there may be 3 huge buttons, each for different OS
	var hugeButtons = content.document.querySelectorAll('#addon p.install-button a.button.concealed.CTA');
	
	if (hugeButtons.length == 0) {
	  hugeButtons = content.document.querySelectorAll('#contribution p.install-button a.button.concealed.CTA');
	  
	  if (hugeButtons.length > 0) {
		isContribPage = true;
	  }
	}
	
	if (hugeButtons.length > 0) {
	  for (var i=0; i<hugeButtons.length; i++) {
		var hugeButton = hugeButtons[i];
		
		var display = content.getComputedStyle(hugeButton, '').getPropertyValue('display');
		
		if (display == 'none') {
		  // hidden button for other OS
		  continue;
		}
		
		hugeButton.classList.remove('concealed');
		hugeButton.classList.remove('CTA');
		hugeButton.style.display = 'inline-block';
		hugeButton.textContent = "Check if SeaMonkey version is available";
		hugeButton.href = this.convertURLToSM(content.location.href);
		
		var link = this.converterURL + "?url=" + encodeURIComponent(content.location.href);
		
		var infoElem = content.document.createElement('div');
		infoElem.style.marginBottom = '1em';
		
		if (isContribPage) {
		  infoElem.style.marginTop = '0.5em';
		  infoElem.style.maxWidth = '400px';
		}
		
		infoElem.innerHTML = "<p style='font-size: 10pt; text-align: left'>If the download button does not appear after checking for SeaMonkey version, it means SeaMonkey is not officially supported. In this case you may try using the <a href='" + this.converterURL + "'>Add-on Converter</a>. Warning: not all converted extensions will work properly in SeaMonkey!</p>"
		+ "<p style='font-size: 10pt; text-align: left'><a href='" + link + "'>Click here</a> to convert this extension &ndash; use only if no SeaMonkey version exists.</p>";
		
		hugeButton.parentNode.appendChild(infoElem);
	  }
	}
  },
  
  /* Modify add-on listing page, e.g. "Up & Coming Extensions" */
  modifyListing: function() {
	var items = content.document.querySelectorAll('div.listing > div.items > div.item.incompatible');
	
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
		div.textContent = "Visit add-on page for SeaMonkey compatibility information.";
		
		action.textContent = '';
		action.appendChild(div);
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
		  span.textContent = "Visit add-on page for SeaMonkey compatibility information.";
		}
	  }
	}
  },
  
  removeEventsFromElem: function(elem) {
	var newElem = elem.cloneNode(true);
	elem.parentNode.replaceChild(newElem, elem);
	return newElem;
  },
  
  /* Convert URL of Fx addon page to SM addon page */
  convertURLToSM: function(url) {
	url = url.replace('/firefox/addon/', '/seamonkey/addon/');
	
	var segm = url.split('/contribute/roadblock/');
	if (segm.length > 1) {
	  // this is URL of contribution page - change to main addon page
	  url = segm[0] + '/';
	}
	
	return url;
  },
  
  /* Get add-on compatibility data from certain elements on page */
  getCompatData: function() {
	var dataElem = content.document.querySelector('div.install-shell div.install');
	
	if (!dataElem) {
	  return {};
	}
	
	var data = {};
	
	data.isCompatible = (dataElem.getAttribute('data-is-compatible') == 'true');
	data.maxVersion = dataElem.getAttribute('data-max');
	
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
	
	return body && body.classList.contains('extensions');
  }

}

amoBr.init();
