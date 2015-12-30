'use strict';

define(['random', 'fap', 'color', 'fn'], (rand, fap, clr, fn) => {
    return (color, cx, cy, cz, radius, working) => {
        var at;
        var firefly = offset => {
            var njump = 2*parseInt(fn.relerp(rand(offset), -1, 1, 1, 4));

            var ox = fap.anim(t => rand(t) * radius).resample(njump);
            var dx = fap.wiggle.shift(1993.7).stretch(1.2).map(x => x*radius);
            var x = fap.anim(t => ox.sample(t) + dx.sample(t) + cx + at.x);

            var oy = fap.anim(t => rand(t*1995) * radius).resample(njump);
            var dy = fap.wiggle.stretch(1.2).map(x => x*radius);
            var y = fap.anim(t => oy.sample(t) + dy.sample(t) + cy + at.y);

            var oz = fap.anim(t => rand(t*1997) * radius).resample(njump);
            var dz = fap.wiggle.shift(-199.6).stretch(1.3).map(x => x*radius);
            var z = fap.anim(t => oz.sample(t) + dz.sample(t) + cz + at.z);

            var blink = fap.wiggle.map(x => fn.relerp(x, -1, 1, 0.6, 1)).stretch(0.13).shift(rand(offset*123));
            var a  = fap.anim(t => blink.sample(t) * Math.min(1, Math.cos(fn.relerp(t, 1, 3, 0, 2*Math.PI)) + 1));
            var r  = fap.ease(0.02, njump, 0.01).repeat(njump);
            return fap.actor('firefly', {
                x, y, z, a,
                color,
                radius: r,
                _trigger: working.resample(njump).shift(-offset),
            }).shift(offset);
        };

        var dust = offset => {
            var ox = fap.anim(t => rand(t) * 2*radius*0.5).resample(2);
            var dx = fap.wiggle.shift(1993.7).stretch(1.2).map(x => x*radius*0.5);
            var x = fap.anim(t => ox.sample(t) + dx.sample(t) + cx + at.x);

            var oy = fap.anim(t => rand(t*1995) * 2*radius*0.5).resample(2);
            var dy = fap.wiggle.stretch(1.2).map(x => x*radius*0.5);
            var y = fap.anim(t => oy.sample(t) + dy.sample(t) + cy + at.y);

            var oz = fap.anim(t => rand(t*1997) * 2*radius*0.5).resample(2);
            var dz = fap.wiggle.shift(-199.6).stretch(1.3).map(x => x*radius*0.5);
            var z = fap.anim(t => oz.sample(t) + dz.sample(t) + cz + at.z);

            var blink = fap.wiggle.map(x => fn.relerp(x, -1, 1, 0.6, 1)).stretch(0.13).shift(rand(offset*123));
            var a  = fap.anim(t => blink.sample(t) * Math.min(1, Math.cos(fn.relerp(t, 1, 3, 0, 2*Math.PI)) + 1));
            var r  = 3*radius*0.8;
            return fap.actor('dust', {
                x, y, z, a,
                color: color.alpha(0.3),
                radius: r,
                _trigger: working.resample(2).shift(-offset),
            }).shift(offset);
        };

        var setup = (x, y, z) => {
            at = { x, y, z };
        };

        var cluster = [];
        var n = 20;
        while (n--) cluster.push(firefly(rand(n*4716)*193427));
        n = 10;
        while (n--) cluster.push(dust(rand(n*716)*93427));

        return fap.identity({ name: 'cluster', data: cluster, setup });
    };
});

