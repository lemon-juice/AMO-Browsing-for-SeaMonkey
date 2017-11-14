This is a page that lists current and past versions of extensions hosted at
https://addons.mozilla.org, and tries to determine when a particular version
might work in SeaMonkey (or be convertible).

Usage:

    index.html?id={addon-slug | numeric-id | guid}

Building
--------

You can use Visual Studio 2017 to compile app.ts. This will also copy the
page + script + CSS to the add-on's content folder and build the .xpi.

You could also install tsc (the TypeScript compiler) yourself (via npm or some
other means) and use it to compile app.ts.
