'use strict';

define(['random', 'fn'], (rand, fn) => {
    var spread = 0.5;
    var max_height = 1;

    var cache = {};
    var height = (i) => fn.relerp(rand(i*1995 + 134), -1, 1, 0, max_height);
    var generate = (i) => {
        if (cache[i] == null) {
            var y = height(i);
            var x = i * spread + rand(i)*spread*0.3;
            cache[i] = { x, y };
        }
        return cache[i];
    };
    return (front, back) => {
        front = parseInt(front/spread) - 2;
        back  = parseInt( back/spread) + 2;

        var result = [];
        for (var i=front; i<=back; i++)
            result.push(generate(i));
        return result;
    };
});

