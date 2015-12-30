'use strict';

define(['url'], (url) => ({
    json (post, base, args, ok, fail) {
        // normalize arguments
        if (  ok == null)   ok = () => {};
        if (fail == null) fail = () => {};

        // prepare callbacks
        var req = new XMLHttpRequest();
        req.onload = () => {
            var json = req.response;
            if (json == null) json = { error: "internal error" };
            if (json.error != null) fail(json.error);
            else ok(json);
        };
        req.onabort = () => fail("abort");
        req.onerror = () => fail("error");

        // fire!
        req.responseType = 'json';
        if (post) {
            req.open('POST', base);
            req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.send(url.build_arg(args).substr(1));    // arg always begins with '?' or empty string
        }
        else {
            req.open('GET', url.build(base, args));
            req.send();
        }
    },

     get_json (base, args, ok, fail) { this.json(false, base, args, ok, fail) },
    post_json (base, args, ok, fail) { this.json( true, base, args, ok, fail) },

    html (base, ok, fail) {
        // normalize arguments
        if (  ok == null)   ok = () => {};
        if (fail == null) fail = () => {};

        // prepare callbacks
        var req = new XMLHttpRequest();
        req.onload = () => {
            var html = req.response;
            if (html == null || req.status !== 200) fail("internal error");
            else ok(html);
        };
        req.onabort = () => fail("abort");
        req.onerror = () => fail("error");

        // fire!
        req.responseType = 'document';
        req.open('GET', base);
        req.send();
    },
}));

