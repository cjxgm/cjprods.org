'use strict';

define(['random', 'fap', 'color'], (rand, fap, clr) => {
    var single_bokeh = (xbound, ybound) => {
        var x = fap.anim(t => rand(t) * xbound).resample(2);
        var oy = fap.anim(t => rand(t*1995) * ybound).resample(2);
        var dy = fap.identity(0)
                .then(0.3, fap.ease(0, 1.7, -0.05))
                .repeat(2);
        var y = fap.anim(t => oy.sample(t) + dy.sample(t));
        var a  = fap.ease(0, 0.1, 0.7)
                .then(0.1, fap.ease(0.7, 0.2, 0.5))
                .then(0.3, fap.ease(0.5, 1.7, 0))
                .repeat(2);
        var r  = fap.identity(0.07)
                .then(0.3, fap.ease(0.07, 1.7, 0.06))
                .repeat(2);
        return fap.actor('bokeh', { x, y, a, z: 0, color: clr.rgba(1,1,1,1), radius: r });
    };

    var bokeh = (n, xbound, ybound) => {
        var bs = [];
        var b = single_bokeh(xbound, ybound);
        while (n--) bs.push(b.shift(rand(n*476)*1935427));
        return bs;
    };
    return bokeh;
});

