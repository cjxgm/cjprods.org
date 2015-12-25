'use strict';

define({
    // break url into { base, arg, anchor }
    //
    // base   will be kept as is (no decodeURI being done)
    // arg    will be kept as is (no decodeURI being done)
    // anchor will be decodeURI.
    //
    // - "base"                     -> { "base", undefined, undefined }
    // - "base?arg"                 -> { "base", "?arg", undefined }
    // - "base#anchor"              -> { "base", undefined, "#anchor" }
    // - "base?arg#anchor"          -> { "base", "?arg", "#anchor" }
    // - "base#anchor?still#anchor" -> { "base", undefined, "#anchor?still#anchor" }
    split (url) {
        var result = {};

        // anchor
        var anchor_at = url.indexOf("#");
        if (anchor_at !== -1) {
            result.anchor = decodeURI(url.substr(anchor_at));
            url = url.substr(0, anchor_at);
        }

        // arg
        var arg_at = url.indexOf("?");
        if (arg_at !== -1) {
            result.arg = url.substr(arg_at);
            url = url.substr(0, arg_at);
        }

        // base
        result.base = url;

        return result;
    },

    // break url arg part into object (key-value pair)
    // will decodeURIComponent
    // "?a=1%200&b=11" -> { a: "1 0", b: "11" }
    parse_arg (arg) {
        if (arg == null) return {};

        var args = {};
        arg.replace(/[?&]+([^=&]+)=([^&]*)/gi, (_, name, value) =>
                    args[decodeURIComponent(name)] = decodeURIComponent(value));
        return args;
    },

    build_arg (args) {
        var arg = [];
        for (var name in args)
            arg.push(encodeURIComponent(name) + "="
                + encodeURIComponent(args[name]));
        if (arg.length === 0) return "";
        return "?" + arg.join("&");
    },

    // parse url into base, arg, anchor args
    parse (url) {
        var result = this.split(url);
        result.args = this.parse_arg(result.arg);
        return result;
    },

    // build url from { base, arg, anchor }
    // { "http://example.com/", "?hi=10&yes=%2F", "#hello/" }
    //   -> "http://example.com/?hi=10&yes=%2F#hello%2F"
    // { "http://example.com/", { hi: 10, yes: "%2F" }, "#hello/" }
    //   -> "http://example.com/?hi=10&yes=%252F#hello%2F"
    build (base, arg, anchor) {
        if (arg == null) arg = "";
        if (typeof arg !== 'string') arg = this.build_arg(arg);

        if (anchor == null) anchor = "";
        anchor = encodeURI(anchor);

        return base + arg + anchor;
    },
});

