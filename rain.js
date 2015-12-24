'use strict';

define(['random', 'fap', 'color', 'fn'], (rand, fap, clr, fn) => {
    var depth = 20;     // camera fog distance
    var at;
    var lens;
    var color = fap.state();

    var rain = (offset) => {
        var oz = fap.anim(t => rand(t*1997) * depth - at.z).resample(1);
        var z  = fap.anim(t => oz.sample(t) + at.z);
        var to_world = fap.anim(t => lens.screen_to_world(z.sample(t))).resample(1);

        var angle = fap.random.stretch(1997).map(x => fn.relerp(x, -1, 1, fn.radians(70), fn.radians(80)));
        var fall  = fap.random.stretch(9937).map(x => fn.relerp(x, -1, 1, 9, 15));
        var length= fap.random.stretch(3791).map(x => fn.relerp(x, -1, 1, 2, 5));

        var ox = fap.anim(t => rand(t) * lens.xbound * to_world.sample(t) - at.x).resample(1);
        var dx = fap.anim(t => -fall.sample(t)*Math.cos(angle.sample(t)) * fn.mod(t, 1));
        var x  = fap.anim(t => ox.sample(t) + dx.sample(t) + at.x);

        var oy = fap.anim(t => fn.relerp(rand(t*1995), -1, 1, 2, 10)).resample(1);
        var dy = fap.anim(t => -fall.sample(t)*Math.sin(angle.sample(t)) * fn.mod(t, 1));
        var y  = fap.anim(t => oy.sample(t) + dy.sample(t) + at.y);

        var a  = fap.ease(0, 0.1, 0.4)
                    .then(0.1, fap.ease(0.4, 0.4, 0.1))
                    .then(0.5, fap.ease(0.1, 0.5, 0))
                    .repeat(1)
                    .map(x => x*0.8);
        var w  = 0.04;
        return fap.actor('rain', {
            x, y, z, a, angle, length,
            color,
            width: w,
        }).shift(offset).stretch(0.5);
    };

    var rains = [];
    var n = 600;
    while (n--) rains.push(rain(rand(n*476)*1935427));

    return (x, y, z, lens_, color_) => {
        at = { x, y, z };
        lens = lens_;
        color.set(color_);
        return rains;
    };
});

