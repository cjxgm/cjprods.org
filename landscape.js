'use strict'

define(['random', 'fn', 'color'], (rand, fn, clr) => {
    var nlayer = 5;
    var depth = 20;     // camera fog distance

    var candidates = [
        {
            make: (i, x, y, z, color) => ({
                name: 'mountain',
                x,
                y: y + fn.relerp(rand(i*147), -1, 1, 0, -1),
                z,
                color,
                spread: 0.7 + fn.relerp(parseInt(rand(i*147)*3), -3, 3, -0.5, 1.5),
                height: 2.5 + fn.relerp(parseInt(rand(i*147)*3), -3, 3, -1, 5),
            }),
        },
        {
            make: (i, x, y, z, color) => ({
                name: 'cliff',
                x,
                y: y+fn.relerp(rand(i*627), -1, 1, 0, -2),
                z,
                color,
                spread: 0.7 + fn.relerp(parseInt(rand(i*627)*3), -3, 3, -0.5, 2),
                height: 2 + fn.relerp(parseInt(rand(i*627)*3), -3, 3, -1, 7),
            }),
        },
    ];

    var pick = i => {
        var c = parseInt(fn.relerp(rand(i*222+147), -1, 1, 0, candidates.length))
        return candidates[c];
    };

    return (x, y, z, color) => {
        var front = fn.relerp(-z, 0, depth, 0, nlayer);
        var front_layer = Math.ceil(front);
        var layers = [];
        for (var i=0; i<nlayer+2; i++) {
            var ilayer = fn.relerp(i, 0, nlayer+1, front_layer, front_layer - nlayer - 1);
            var ox = x + rand(ilayer*173) * 1996;
            var oy = y + rand(ilayer*731);
            var oz = z + fn.relerp(ilayer, 0, nlayer, 0, depth) + rand(ilayer*1997+3)*0.4;
            layers.push(pick(ilayer).make(ilayer, ox, oy, oz, color));
        }
        return layers;
    };
});

