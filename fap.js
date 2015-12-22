'use strict';

// T? => T | ()
// anim T => time -> T?
// spec => { name: (anim value | value) }
// actor => anim { name: anim }
// sampler T => time -> T?

define(() => {
    // anim :: sampler T -> anim T
    var anim = (() => {
        function anim(sampler)
        {
            if (sampler == null) sampler = t => null;
            this.sample = sampler;
        }

        var _ = anim.prototype;

        _.shift = function(offset) {
            if (offset === 0) return this;
            return new anim((
                sample => t => sample(t-offset)
            )(this.sample));
        };

        _.stretch = function(scale) {
            if (scale === 1) return this;
            return new anim(scale === 0 ? null : (
                sample => t => sample(t / scale)
            )(this.sample));
        };

        _.cutl = function(at) {
            return new anim((
                sample => t => t < at ? null : sample(t)
            )(this.sample));
        };

        _.cutr = function(at) {
            return new anim((
                sample => t => t > at ? null : sample(t)
            )(this.sample));
        };

        _.cut = function(l, r) {
            return this.cutl(l).cutr(r);
        };

        _.repeat = function(duration) {
            return new anim((
                sample => t => sample((t % duration + duration) % duration)
            )(this.sample));
        };

        _.resample = function(duration) {
            var last_frame;
            var last_sample;
            return new anim((
                sample => t => (
                    frame => last_frame === frame
                        ? last_sample
                        : last_sample = sample(frame*duration)
                )(Math.floor(t / duration))
            )(this.sample));
        };

        _.then = function(after, a) {
            return new anim((
                sample => t => t < after ? sample(t) : a.sample(t - after)
            )(this.sample));
        };

        return anim;
    })();

    // actor :: name -> spec -> actor
    var actor = (name, spec) => {
        if (name == null) return new anim();
        if (spec == null) spec = {};
        spec.name = name;

        // value >>> anim value
        for (var name in spec)
            if (!(spec[name] instanceof anim))
                spec[name] = new anim((x => t => x)(spec[name]));

        return new anim(t => {
            var result = {};
            for (var name in spec) {
                var sample = spec[name].sample(t);
                if (sample == null) return null;
                result[name] = sample;
            }
            return result;
        });
    };

    // TODO
    // modifier => anim T ->     ->  T

    // ease :: speed -> offset -> anim just number
    //var ease = (speed, offset) => (offset => new anim(t => t*speed + offset))(offset || 0);
    var ease = (y0, x, y) => new anim(t => (y-y0)/x * t + y0);
    var identity = (x) => new anim(t => x);

    return { anim, actor, ease, identity };
});

