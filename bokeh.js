'use strict';

define(['random', 'fap', 'color'], (rand, fap, clr) => {
    var lens;

    var bokeh = (offset) => {
        var x = fap.anim(t => rand(t) * lens.xbound).resample(2);

        var lower = x => (x + 1) * (x + 1) / 2 - 1;
        var oy = fap.anim(t => lower(rand(t*1995)) * lens.ybound).resample(2);
        var dy = fap.identity(0)
                .then(0.3, fap.ease(0, 1.7, -0.05))
                .repeat(2);
        var y = fap.anim(t => oy.sample(t) + dy.sample(t));

        var a  = fap.ease(0, 0.1, 0.5)
                .then(0.1, fap.ease(0.5, 0.2, 0.4))
                .then(0.3, fap.ease(0.4, 1.7, 0))
                .repeat(2);
        var r  = fap.identity(0.07)
                .then(0.3, fap.ease(0.07, 1.7, 0.06))
                .repeat(2);

        return fap.actor('bokeh', {
            x, y, a,
            z: 0,
            color: clr.rgb(0,0,0),  // unused
            radius: r
        }).shift(offset);
    };

    var n = 20;
    var bokehs = [];
    while (n--) bokehs.push(bokeh(rand(n*476)*1935427));

    return (lens_) => {
        lens = lens_;
        return bokehs;
    };
});

