'use strict';

define(['random', 'fn'], (rand, fn) => {
    var spread = 0.5;
    var max_height = 1;
    var detail = 10;

    var cache = {};
    var height = (i) => fn.relerp(rand(i*1995 + 134), -1, 1, 0, max_height);
    var flatten = (y, threshold, pressure) =>
            y < threshold ? y * (1-pressure)
                          : (y - threshold) * (1-pressure) + pressure + threshold;
    var height2 = (i, threshold, pressure) => flatten(height(i), threshold, pressure);
    var generate = (i) => {
        if (cache[i] == null) {
            var threshold = max_height * 0.4;
            var pressure = 0.4;
            var y = height2(i, threshold, pressure);
            var y0 = height2(i-1, threshold, pressure);
            var y1 = height2(i+1, threshold, pressure);
            if (y > threshold && y0 < threshold && y1 < threshold)
                y = (y + y0*3 + y1*3) / 7;
            var x = i * spread + rand(i)*spread*0.3;
            cache[i] = { x, y };
        }
        return cache[i];
    };

    var detail_cache = {};
    var generate_detail = (i) => {
        if (detail_cache[i] == null) {
            var threshold = max_height * 0.4;
            var pressure = 0.4;
            var di = Math.floor(i / detail);
            var p0 = generate(di);
            var p1 = generate(di+1);
            var x = fn.relerp(i/detail-di, 0, 1, p0.x, p1.x);
            var y = fn.relerp(i/detail-di, 0, 1, p0.y, p1.y);
            if (Math.abs(p0.y-p1.y) > threshold) {
                var tension = fn.relerp(rand(di*1997+9876), -1, 1, 0, (p0.y < p1.y ? 1 : -1) / spread / 2);
                var t = fn.relerp(y, 0, max_height, 1, -0.8);
                t = 1 - (1-t) * (1-t);
                x += rand(y*1996+321) * 0.1 + t*tension * 0.4;
            }
            detail_cache[i] = { x, y };
        }
        return detail_cache[i];
    };

    return (front, back) => {
        front = Math.floor(front/spread) - 2;
        back  = Math.ceil ( back/spread) + 2;
        front *= detail;
        back  *= detail;

        var result = [];
        for (var i=front; i<=back; i++)
            result.push(generate_detail(i));
        return result;
    };
});

