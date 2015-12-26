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

        // `this` should have no side effect, or `resample` becomes `throttle`
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

        // `this` must have no side effect
        _.smooth = function(dura) {
            if (dura == null) dura = 1;
            var s = this.shift(dura).resample(dura);
            var e = this.resample(dura);
            return new anim(t => (
                (a, b) => a === b
                    ? a
                    : fn.lerp(fn.smoothstep(fn.mod(t, dura) / dura), a, b)
            )(s.sample(t), e.sample(t)));
        };

        // `this` must have no side effect
        _.linear = function(dura) {
            if (dura == null) dura = 1;
            var s = this.shift(dura).resample(dura);
            var e = this.resample(dura);
            return new anim(t => (
                (a, b) => a === b
                    ? a
                    : fn.lerp(fn.mod(t, dura) / dura, a, b)
            )(s.sample(t), e.sample(t)));
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
        _.edge = function(last) {
            return new anim((sample =>
                t => (s =>
                    s === last ? null : last = s
                )(sample(t))
            )(this.sample));
        };

        // `edge` base on deep comparison
        _.dedge = function(last) {
            return new anim((sample =>
                t => (s =>
                    fn.same(s, last) ? null : last = s
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

        // FIXME: DEPRECATED
        _.smoothswitch = function(dura) {
            if (dura == null) dura = 1;
            var s = this.map(x => x ? 1 : 0).resample(dura);
            var e = s.edge(0).map(x => x == null ? 2 : x).resample(dura);
            var on  = new anim(t => fn.smoothstep(t/dura)).repeat(dura);
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
    var tween = (() => {
        var tweeners = {
            hold  : k => 0,
            linear: k => k,
            smooth: k => fn.smoothstep(k),
        };

        // spec => { tween: ('hold' | 'smooth' | 'linear'), data: [ [time, value] ] }
        return spec => {
            // sanitize arguments
            var data = spec.data;
            if (data == null || data.length === 0) return identity(null);
            data.sort((a, b) => a[0] - b[0]);   // sort by time

            var srate = spec.sample_rate;
            if (srate == null) srate = 10;

            var tween = tweeners[spec.tween];
            if (spec.tween == null) tween = tweeners.smooth;
            if (tween == null) throw `unknown tweening method: ${spec.tween}`;

            // tweening at sample rate `srate`
            var start_frame = Math.floor(data[            0][0] * srate);
            var   end_frame = Math.ceil (data[data.length-1][0] * srate);

            //:: shift by 1/srate is enough, 2 is used for float inaccuracy prevention.
            data.unshift([data[            0][0] - 2 / srate, data[0][1]]);
            data.push   ([data[data.length-1][0] + 2 / srate, data[0][1]]);

            var idata = 0;
            var samples = [];
            for (var iframe=start_frame; iframe<=end_frame; iframe++) {
                var time = iframe / srate;
                while (time >= data[idata+1][0]) idata++;

                var data0 = data[idata  ];
                var data1 = data[idata+1];

                var k = tween(fn.unlerp(time, data0[0], data1[0]));
                var value = fn.lerp(k, data0[1], data1[1]);
                samples[iframe-start_frame] = value;
            }

            var sample = i => i < 0 ? samples[0] :
                i < samples.length ? samples[i] :
                samples[samples.length-1];

            return anim(t => (
                frame => (
                    (i, k) => fn.lerp(k, sample(i), sample(i+1))
                )(Math.floor(frame), fn.mod(frame, 1))
            )(t * srate - start_frame));
        };
    })();

    // built-in anims
    var random = anim(t => rand(t)).resample(1);
    var wiggle = random.smooth();

    // extra operators
    var zip = (f, ...as) => anim(t => f(...as.map(a => a.sample(t))));

    return {
        anim, actor, state,
        identity, ease, tween,
        random, wiggle,
        zip,
    };
});

