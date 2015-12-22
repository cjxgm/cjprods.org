'use strict';

define(['random', 'fn', 'fap', 'color'], (rand, fn, fap, clr) => {
    var spread;
    var max_height;

    var cache_selector = {};
    var select_cache = (...args) => {
        var a = JSON.stringify(args);
        if (cache_selector[a] == null) cache_selector[a] = {};
        return cache_selector[a];
    }

    var cache;
    var height = (i) => fn.relerp(rand(i*1996 + 1995), -1, 1, 0, max_height);
    var generate = (i) => {
        if (cache[i] == null) {
            var y = height(i);
            var x = i * spread + rand(i)*spread*0.8;
            cache[i] = { x, y };
        }
        return cache[i];
    };

    var single_bokeh = (xbound, ybound) => {
        var x = new fap.anim(t => rand(t) * xbound).resample(2);
        var oy = new fap.anim(t => rand(t*1995) * ybound).resample(2);
        var dy = fap.identity(0)
                .then(0.3, fap.ease(0, 1.7, -0.05))
                .repeat(2);
        var y = new fap.anim(t => oy.sample(t) + dy.sample(t));
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

    return (front, back, height, spread_) => {
        spread = (spread_ == null ? 1 : spread_);
        max_height = (height == null ? 4 : height);
        cache = select_cache(spread, max_height);

        front = parseInt(front/spread) - 2;
        back  = parseInt( back/spread) + 2;

        var result = [];
        var width = back-front;
        if (width > 1000) { // LOD
            result.push(generate(parseInt((front+back)/2)));
            return result;
        }

        var skip = 1;
        if (width > 100) {      // LOD
            skip = Math.floor(width / 100);
            skip = parseInt(skip);
            front = parseInt(front / skip) * skip;
        }
        for (var i=front; i<=back; i+=skip)
            result.push(generate(i));
        return result;
    };
});

