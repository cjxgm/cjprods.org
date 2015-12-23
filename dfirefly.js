'use strict';

define(['random', 'fap', 'color', 'fn'], (rand, fap, clr, fn) => {
    var xbound, ybound;
    var depth = 20;     // camera fog distance
    var at;
    var single_rain = (offset) => {
        var rx = new fap.anim(t => rand(t) * xbound - at.x).resample(2);
        var x = new fap.anim(t => rx.sample(t) + at.x);

        var oy = new fap.anim(t => fn.relerp(rand(t*1995), -1, 1, -1, 4)).resample(2);
        var dy = fap.identity(0)
                .then(0.3, fap.ease(0, 1.7, 0.2))
                .repeat(2);
        var y = new fap.anim(t => oy.sample(t) + dy.sample(t) + at.y);

        var oz = new fap.anim(t => rand(t*1997) * depth - at.z).resample(2);
        var z = new fap.anim(t => oz.sample(t) + at.z);

        var a  = new fap.anim(t => Math.min(1, Math.cos(fn.relerp(t, 1, 3, 0, 2*Math.PI)) + 1));
        var r  = fap.identity(0.04);
        return fap.actor('dfirefly', {
            x,
            y,
            z,
            a,
            color: clr.hex('#85FF00').alpha(0.8),
            radius: r,
        }).shift(offset);
    };

    var rains = [];
    var n = 600;
    while (n--) rains.push(single_rain(rand(n*476)*1935427));

    var rain = (xbound_, ybound_, x, y, z) => {
        xbound = xbound_;
        ybound = ybound_;
        at = { x, y, z };
        return rains;
    };
    return rain;
});

