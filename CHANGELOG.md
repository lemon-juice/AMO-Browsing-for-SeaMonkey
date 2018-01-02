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

v0.10
-----

This version marks a change in how Firefox and Thunderbird add-ons are handled.

Instead of an install button, add-on details pages now have a button (or link)
that reads "View Version History." This link takes you to a new page, which
lists the most recent versions of an add-on, and offers install, convert,
and/or download buttons when appropriate. For example, for a Firefox
extension, you can use this page to check whether older, non-WebExtensions
versions exist, and try to install them.

The extension also includes its own alternate search page; click the link
labeled "use the AMO Browsing extension to search" under AMO's search box.
This type of search includes Firefox, Thunderbird, and SeaMonkey extensions.
(You can also keep using the search page on AMO if you prefer.)
