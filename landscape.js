'use strict'

define(['random', 'fn', 'color'], (rand, fn, clr) => {
    var nlayer = 8;
    var depth = 10;     // camera fog distance
    var spread = 1;

    var candidates = [
        {
            make: (i, x, y, z) => ({
                name: 'mountain',
                x,
                y,
                z,
                color: clr.hex('#4F0761'),
                spread: 0.7 + 0.5 * parseInt(rand(i*147+222)*3)/3,
                height: 2.5 + parseInt(rand(i*147+222)*3)/3,
            }),
        },
        {
            make: (i, x, y, z) => ({
                name: 'cliff',
                x,
                y,
                z,
                color: clr.hex('#4F0761'),
                spread: 0.7 + 0.5 * parseInt(rand(i*147+222)*3)/3,
                height: 2 + parseInt(rand(i*147+222)*3)/3,
            }),
        },
        {
            make: (i, x, y, z) => ({
                name: 'firefly',
                x,
                y,
                z,
                color: clr.hex('#4F0761'),
                spread: 1.3 + 0.5 * parseInt(rand(i*147+222)*3)/3,
                height: 4.5 + parseInt(rand(i*147+222)*3)/3,
                color: clr.hex('#85FF00').alpha(fn.relerp(rand(i*147+222), -1, 1, 0.75, 0.95)),
            }),
        },
    ];

    var pick = i => {
        var c = parseInt(fn.relerp(rand(i*222+147), -1, 1, 0, candidates.length))
        return candidates[c];
    };

    return (x, y, z) => {
        var front = -z;
        var front_layer = Math.ceil(front / spread);
        var layers = [];
        for (var i=0; i<nlayer+2; i++) {
            var ilayer = fn.relerp(i, 0, nlayer+1, front_layer, front_layer - nlayer - 1);
            var ox = x + rand(ilayer*173) * 1996;
            var oy = y + rand(ilayer*731);
            var oz = fn.relerp(z+ilayer, 0, nlayer, 0, depth) + rand(ilayer*1997+3)*0.4;
            layers.push(pick(ilayer).make(ilayer, ox, oy, oz));
        }
        return layers;
    };
});

