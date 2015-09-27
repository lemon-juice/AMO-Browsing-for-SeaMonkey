"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

function startup(data,reason) {
  forEachOpenWindow(loadIntoWindow);
  Services.wm.addListener(WindowListener);
}

function shutdown(data,reason) {
  if (reason == APP_SHUTDOWN) {
    return;
  }

  forEachOpenWindow(unloadFromWindow);
  Services.wm.removeListener(WindowListener);
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(data,reason) {}

function uninstall(data,reason) {}

function loadIntoWindow(window) {
  var winType = window.document.documentElement.getAttribute("windowtype");
  
  if (winType == "navigator:browser") {
    window.messageManager.loadFrameScript("chrome://amobrowsing/content/frame-script.js", true);
  }
}

function unloadFromWindow(window) {
  var numTabs = window.gBrowser.browsers.length;
  
  for (var i = 0; i < numTabs; i++) {
    var currentBrowser = window.gBrowser.getBrowserAtIndex(i);
    currentBrowser.messageManager.sendAsyncMessage("AMOBrowsing:removeEvents");
  }
}


// Apply a function to all open browser windows
function forEachOpenWindow(todo) {
  var windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
  }
}


var WindowListener = {

  onOpenWindow: function(xulWindow) {
    var window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                          .getInterface(Components.interfaces.nsIDOMWindow);

    function onWindowLoad() {
      window.removeEventListener("load",onWindowLoad);
      loadIntoWindow(window);
    }
    window.addEventListener("load",onWindowLoad);
  },

  onCloseWindow: function(xulWindow) { },
  onWindowTitleChange: function(xulWindow, newTitle) { }
};
