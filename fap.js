'use strict';

// T? => T | ()
// anim T => time -> T?
// spec => { name: (anim value | value) }
// actor => anim { name: anim }
// sampler T => time -> T?

define(['random', 'fn'], (rand, fn) => {
    // anim :: sampler T -> anim T
    var anim = (() => {
        function anim(sampler)
        {
            if (sampler == null) sampler = t => null;
            this.sample = sampler;
        }

        var _ = anim.prototype;

        // basic op
        _.mapt = function(f) {
            return new anim((sample =>
                t => sample(f(t))
            )(this.sample));
        };

        _.filtert = function(f, otherwise) {
            if (otherwise === undefined) otherwise = null;
            return new anim((sample =>
                t => f(t) ? sample(t) : otherwise
            )(this.sample));
        };

        _.map = function(f) {
            return new anim((sample =>
                t => f(sample(t))
            )(this.sample));
        };

        _.then = function(after, a) {
            return new anim((
                sample => t => t < after ? sample(t) : a.sample(t - after)
            )(this.sample));
        };


        // sugars
        _.shift = function(offset) {
            if (offset === 0) return this;
            return this.mapt(t => t - offset);
        };

        _.stretch = function(scale) {
            if (scale === 1) return this;
            return this.mapt(t => t / scale);
        };

        _.repeat = function(duration) {
            return this.mapt(t => fn.mod(t, duration));
        };


        _.cut = function(l, r, otherwise) {
            return this.filtert(t => l <= t && t <= r, otherwise);
        };

        _.cutl = function(at, otherwise) {
            return this.filtert(t => t >= at, otherwise);
        };

        _.cutr = function(at, otherwise) {
            return this.filtert(t => t <= at, otherwise);
        };

        // side effects
        _.resample = function(duration) {
            var last_frame;
            var last_sample;
            return new anim((
                sample => t => (
                    frame => last_frame === frame
                        ? last_sample
                        : (last_frame = frame,
                           last_sample = sample(frame*duration))
                    )(Math.floor(t / duration))
                )(this.sample));
        };

        _.edge = function(last) {
            return new anim((sample =>
                t => (s =>
                    s === last ? null : last = s
                )(sample(t))
            )(this.sample));
        };

        _.select = function(...selections) {
            return new anim((sample =>
                t => (s =>
                    s == null ? null : selections[s].sample(t)
                )(sample(t))
            )(this.sample));
        };

        _.smoothswitch = function() {
            var s = this.map(x => x ? 1 : 0).resample(1);
            var e = s.edge(0).map(x => x == null ? 2 : x).resample(1);
            var on  = anim(t => fn.smoothstep(t)).repeat(1);
            var off = on.stretch(-1);
            return e.select(off, on, s);
        };


        // maker
        var make = (...args) => new anim(...args);
        make.is = x => x instanceof anim;

        return make;
    })();

    // { *: value | [this] } >>> { *: anim value | [this] }
    var sanitize_spec = spec => {
        for (var name in spec) {
            if (spec[name] instanceof Array) {
                var s = spec[name];
                s.forEach((a, i) => {
                    if (!anim.is(a)) s[i] = anim(t => a)
                });
                continue;
            }

            if (!anim.is(spec[name])) {
                spec[name] = anim((x => t => x)(spec[name]));
                continue;
            }
        }
    };

    // actor :: name -> spec -> actor
    var actor = (name, spec) => {
        if (name == null) return anim();
        if (spec == null) spec = {};
        spec.name = name;
        sanitize_spec(spec);

        var sample = (spec, t) => {
            var result = {};
            for (var name in spec) {
                var value = spec[name];
                var sp = (value instanceof Array
                         ? value.map(a => a.sample(t)).filter(x => x != null)
                         : value.sample(t));
                if (sp == null) return null;
                result[name] = sp;
            }
            return result;
        };

        return anim(t => sample(spec, t));
    };

    // a side-effect anim, whose result is dependent on the value set by calling `set`
    var state = (initial) => {
        if (initial === undefined) initial = null;
        var a = anim(t => initial);
        a.set = x => initial = x;
        return a;
    };

    // extra anim makers
    var identity = x => anim(t => x);
    var ease = (y0, x, y) => anim(t => (y-y0)/x * t + y0);
    var smoothstair = level_dura => anim(t => (
        t => t < level_dura / 2
            ? 1
            : fn.smoothstep(fn.relerp(t, level_dura/2, 0.5, 1, 0))
    )(Math.abs(t))).shift(0.5).repeat(1);

    // built-in anims
    var random = anim(t => rand(t)).resample(1);
    var wiggle = anim(
        t => (
            (f, k) => fn.lerp(fn.smoothstep(k), random.sample(f), random.sample(f+1))
        )(Math.floor(t), fn.mod(t, 1))
    );

    // extra operators
    var zip = (f, ...as) => anim(t => f(...as.map(a => a.sample(t))));

    return {
        anim, actor, state,
        identity, ease, smoothstair,
        random, wiggle,
        zip,
    };
});

