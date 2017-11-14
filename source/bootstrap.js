"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

var sessionStartTime;

var MessageListener = {
  // https://stackoverflow.com/a/21701667/5170952
  receiveMessage: function (aMsgEvent) {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator)
      .getMostRecentWindow('navigator:browser');
    win.gBrowser.selectedTab = win.gBrowser.addTab(`chrome://amobrowsing/content/versions.html?host=${encodeURIComponent(aMsgEvent.data.hostname)}&id=${aMsgEvent.data.id}`);
  }
};

function startup(data,reason) {
  // we use time to append to frame sript URLs to make upgrades effective immediately
  // due to Bug 1051238
  sessionStartTime = Date.now();

  var upgrade = (reason == ADDON_UPGRADE || reason == ADDON_DOWNGRADE);
  
  forEachOpenWindow(function(window) {
    loadIntoWindow(window, upgrade);
  });
  
  Services.wm.addListener(WindowListener);
  Services.mm.addMessageListener("amo-browsing:versions", MessageListener);
}

function shutdown(data,reason) {
  if (reason == APP_SHUTDOWN) {
    return;
  }
  
  var upgrade = (reason == ADDON_UPGRADE || reason == ADDON_DOWNGRADE);
  
  forEachOpenWindow(function(window) {
    unloadFromWindow(window, upgrade);
  });
  
  Services.wm.removeListener(WindowListener);
  Services.mm.removeMessageListener("amo-browsing:versions", MessageListener);
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(data,reason) {}

function uninstall(data,reason) {}

function loadIntoWindow(window, upgrade) {
  if (upgrade) {
    // use timeout to prevent race conditions on upgrades (work around Bug 1202125)
    window.setTimeout(function(win) {
      win.messageManager.loadFrameScript("chrome://amobrowsing/content/frame-script.js?" + sessionStartTime, true);
    }, 250, window);
    
  } else {
    window.messageManager.loadFrameScript("chrome://amobrowsing/content/frame-script.js?" + sessionStartTime, true);
  }
}

function unloadFromWindow(window, upgrade) {
  window.messageManager.removeDelayedFrameScript("chrome://amobrowsing/content/frame-script.js?" + sessionStartTime);
  
  window.messageManager.broadcastAsyncMessage("AMOBrowsing:removeEvents");
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
