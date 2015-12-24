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

        _.edge = function(digitizer, last) {
            if (digitizer == null) digitizer = x => x;
            return new anim((sample =>
                t => (digital =>
                    digital === last ? null : last = digital
                )(digitizer(sample(t)))
            )(this.sample));
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

    var state = (initial) => {
        if (initial === undefined) initial = null;
        var a = anim(t => initial);
        a.set = x => initial = x;
        return a;
    };

    // TODO
    // modifier => anim T ->     ->  T

    // ease :: speed -> offset -> anim just number
    var ease = (y0, x, y) => anim(t => (y-y0)/x * t + y0);
    var identity = x => anim(t => x);
    var random = anim(t => rand(t)).resample(1);
    var wiggle = anim(
        t => (
            (f, k) => fn.lerp(fn.smoothstep(k), random.sample(f), random.sample(f+1))
        )(Math.floor(t), fn.mod(t, 1))
    );

    return { anim, actor, state, ease, identity, random, wiggle };
});

