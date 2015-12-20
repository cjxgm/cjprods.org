'use strict';

define(['cliff'], (cliff) => {
    return (fov, xbound, ybound) => {
        //---- functional utilities
        var flatten = (array) => [].concat(...array);
        var flatmap = (array, f) => flatten(array.map(f));
        var vmap = (kv, f) => {
            var result = {};
            for (var k in kv) result[k] = f(kv[k], k);
            return result;
        };


        //---- perspective transformation
        var screen_to_world = (fov => {
            var radians = deg => deg / 180 * Math.PI;
            var t = Math.tan(radians(fov / 2));
            var k = -t;
            var b = 1 + t;
            return z => k*z + b;
        })(fov);


        //---- apply


        //---- render
        var render = (() => {
            // convert rendercalls to rendercalls, or,
            // convert rendercalls to   drawcalls
            var phase = (renderers, calls) =>
                flatmap(calls, call => renderers[call.name](call));

            var renderers = {};

            renderers.hl = {
                cliff (rcall) {
                    var to_world = screen_to_world(rcall.z);
                    var wxbound = xbound * to_world;    // world x bound
                    var wybound = ybound * to_world;    // world y bound
                    var data = cliff(-rcall.x-wxbound, -rcall.x+wxbound)
                                .map(p => ({
                                    x: p.x + rcall.x,
                                    y: p.y + rcall.y,
                                }));
                    data.unshift({ x: -wxbound, y: -wybound });
                    data.push   ({ x:  wxbound, y: -wybound });
                    return {
                        name: 'polygon',
                        data,
                        z: rcall.z,
                        color: rcall.color,
                    };
                },
            };

            renderers.ll = {
                polygon (rcall) {
                    var to_world = screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => vmap(world, x => x * to_screen));
                    return [
                        {
                            name: 'polygon',
                            data,
                            color: rcall.color, // TODO
                        },
                        {
                            name: 'line',
                            data,
                            color: rcall.color, // TODO
                            width: 1, // TODO
                        },
                    ];
                },
            };

            return rendercalls =>
                phase(renderers.ll, phase(renderers.hl, rendercalls));
        })();

        // invoker
        return scene => render(scene);
    };
});

