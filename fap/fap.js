"use strict";

// T? => T | ()
// anim T => time -> T?
// spec => { name: (anim value | value) }
// actor => anim { name: anim }

// sampler T => time -> T?
// anim :: sampler T -> anim T
var anim = () => {
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

    return anim;
}();

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

// modifier => anim T ->     ->  T

// ease :: speed -> offset -> anim just number
var ease = (speed, offset) => (offset => new anim(t => t*speed + offset))(offset || 0);

// circle :: radius -> actor
var circle = radius => actor('circle', { radius });
var move = (offset, a) => actor('move', { offset, a });

var dot = (radius, x, y, a) => actor('dot', { radius, x, y, a });
var bokeh = (x, y, a) => dot(10, x, y, a);

var random = a => {
    a = parseInt(a);
    a = (a ^ 61) ^ (a >> 16);
    a = a + (a << 3);
    a = a ^ (a >> 4);
    a = a * 0x27d4eb2d;
    a = a ^ (a >> 15);
    return 2 * ((a / 0x7fffffff) - 0.5);
};

var rand = a => new anim(t => random(a.sample(t)));
var round = (a, precision) => new anim(t => Math.round(a.sample(t) / precision) * precision);

var bokeh_layer = bokeh(
    round(rand(ease(1).resample(2)), 0.1),
    round(rand(ease(321, 199).resample(2)), 0.1),
    ease(-0.5, 1).repeat(2));

var bokehs = (n, spacing) =>
    new anim(t => {
        var result = [];
        for (var i=0; i<n; i++)
            result.push(bokeh_layer.shift(i*i*spacing).sample(t));
        return result;
    });

var b = bokehs(20, 7);

for (var i=0; i<200; i++)
    console.log(b.sample(i/20*4));

