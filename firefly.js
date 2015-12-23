'use strict';

define(['random', 'fap', 'color', 'fn'], (rand, fap, clr, fn) => {
    var xbound, ybound;
    var depth = 20;     // camera fog distance
    var at;

    var firefly = (offset) => {
        var njump = 2*parseInt(fn.relerp(rand(offset), -1, 1, 1, 4));
        // x: screen coordinate
        // y:  world coordinate
        var ox = fap.anim(t => rand(t) * xbound - at.x).resample(njump);
        var dx = fap.wiggle.shift(1993.7).stretch(1.2).map(x => x*0.1);
        var x = fap.anim(t => ox.sample(t) + dx.sample(t) + at.x);

        var oy = fap.anim(t => fn.relerp(rand(t*1995), -1, 1, -1, 4)).resample(njump);
        var dy = fap.wiggle.stretch(1.2).map(x => x*0.1);
        var y = fap.anim(t => oy.sample(t) + dy.sample(t) + at.y);

        var oz = fap.anim(t => rand(t*1997) * depth - at.z).resample(njump);
        var dz = fap.wiggle.shift(-199.6).stretch(1.3).map(x => x*0.05);
        var z = fap.anim(t => oz.sample(t) + dz.sample(t) + at.z);

        var a  = fap.anim(t => Math.min(1, Math.cos(fn.relerp(t, 1, 3, 0, 2*Math.PI)) + 1));
        var r  = 0.04;
        return fap.actor('firefly', {
            x,
            y,
            z,
            a,
            color: clr.hex('#85FF00').alpha(0.8),
            radius: r,
        }).shift(offset);
    };

    var fireflys = [];
    var n = 600;
    while (n--) fireflys.push(firefly(rand(n*476)*1935427));

    return (xbound_, ybound_, x, y, z) => {
        xbound = xbound_;
        ybound = ybound_;
        at = { x, y, z };
        return fireflys;
    };
});

