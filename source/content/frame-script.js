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
	
	var app = this._getPageApp();
	
	if (app == 'seamonkey') {
	  this._modifySeaMonkeyPage();
	  
	} else if (app == 'firefox') {
	  this._modifyFirefoxPage();
	}
  },
  
  _modifySeaMonkeyPage: function() {
	var button = content.document.querySelector('p.install-button a.button.add.concealed');
	
	if (button) {
	  button = this._removeEvents(button);
	  button.classList.remove('concealed');
	  button.style.background = '#b89b0e linear-gradient(#cec026, #a68d00) repeat scroll 0 0';
	  
	  var compatData = this._getCompatData();
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
		  + "However, it is very likely it will work fine also in newer versions.";
		  
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
  
  _modifyFirefoxPage: function() {
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
		hugeButton.href = this._convertURLToSM(content.location.href);
		
		var link = this.converterURL + "?url=" + encodeURIComponent(content.location.href);
		
		var infoElem = content.document.createElement('div');
		infoElem.style.marginBottom = '1em';
		
		if (isContribPage) {
		  infoElem.style.marginTop = '0.5em';
		  infoElem.style.maxWidth = '400px';
		}
		
		infoElem.innerHTML = "<p style='font-size: 10pt; text-align: left'>If you are redirected back to this page after checking for SeaMonkey version, it means SeaMonkey is not officially supported. In this case you may try using the <a href='" + this.converterURL + "'>Add-on Converter</a>. Warning: not all extensions will work properly in SeaMonkey!</p>"
		+ "<p style='font-size: 10pt; text-align: left'><a href='" + link + "'>Click here</a> to convert this extension &ndash; use only if no SeaMonkey version exists.</p>";
		
		hugeButton.parentNode.appendChild(infoElem);
	  }
	}
  },
  
  _removeEvents: function(elem) {
	var newElem = elem.cloneNode(true);
	elem.parentNode.replaceChild(newElem, elem);
	return newElem;
  },
  
  // Convert URL of Fx addon page to SM addon page
  _convertURLToSM: function(url) {
	url = url.replace('/firefox/addon/', '/seamonkey/addon/');
	
	var segm = url.split('/contribute/roadblock/');
	if (segm.length > 0) {
	  // this is URL of contribution page - change to main addon page
	  url = segm[0] + '/';
	}
	
	return url;
  },
  
  _getCompatData: function() {
	var dataElem = content.document.querySelector('div.install-shell div.install');
	
	if (!dataElem) {
	  return {};
	}
	
	var data = {};
	
	data.isCompatible = (dataElem.getAttribute('data-is-compatible') == 'true');
	data.maxVersion = dataElem.getAttribute('data-max');
	
	return data;
  },
  
  _getPageApp: function() {
	var body = content.document.body;
	
	if (!body) {
	  return null;
	}
	
	var isAddonPage = (body.classList.contains('addon-details')
		|| (body.classList.contains('meet')
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
  }

}

amoBr.init();
