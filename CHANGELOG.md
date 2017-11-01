v0.9.16
-------

Fixes to get it working again with AMO:

* Changes to the page are delayed further, until the other scripts on the page have run.
* Fixed the selector for the "get Firefox now" button on the search results and listing pages.
* If an add-on is WebExtensions:
  * On the search/listing page, the button is replaced with a message.
  * On the add-on details page, a message is added and the user is given a link to the version history page.
* Converter links are now present on the versions page, if the version is not WebExtensions.
* On the new AMO site, a message is added to the details page with some relevant links.

v0.9.17
-------

* Improved support for the new/mobile AMO. This add-on now uses the AMO API to get information about past versions of an add-on and adds a relevant message to the details page.
  * A link will be added to download the most recent SeaMonkey version, if there is any.
  * Otherwise, the most recent version will be shown.
    * If it's a legacy extension, a link to the converter will be added.
	* If it uses WebExtensions, but an older legacy version is available, a link to the version history page will be added.
	* Otherwise, AMO's API will be used to offer possible replacements. (This API is designed to offer WebExtensions replacements for legacy extensions; here we're using it in reverse.)
* On the old Firefox Add-ons site, the add-on details page will now show the same message that is shown on the new site. Users no longer have to click the button to check whether a SeaMonkey version is available.
* The AMO development environment (addons-dev.allizom.org) is now supported too.
