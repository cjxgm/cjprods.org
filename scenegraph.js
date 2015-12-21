'use strict';

define(['fn', 'cliff', 'mountain'], (fn, cliff, mt) => {
    return lens => {
        //---- apply


        //---- render
        var render = (() => {
            // convert rendercalls to rendercalls, or,
            // convert rendercalls to   drawcalls
            var phase = (renderers, calls) =>
                fn.flatmap(calls, call => renderers[call.name](call));

            var renderers = {};

            renderers.hl = {
                cliff (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var wxbound = lens.xbound * to_world;   // world x bound
                    var wybound = lens.ybound * to_world;   // world y bound
                    var data = cliff(-rcall.x-wxbound, -rcall.x+wxbound, rcall.height, rcall.spread)
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

                mountain (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var wxbound = lens.xbound * to_world;   // world x bound
                    var wybound = lens.ybound * to_world;   // world y bound
                    var data = mt(-rcall.x-wxbound, -rcall.x+wxbound, rcall.height, rcall.spread)
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
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => fn.vmap(world, x => x * to_screen));
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

            var clip = rcall => {
                if (rcall.z >= 0) return [];
                rcall.color = rcall.color.alpha(lens.field(rcall.z).alpha);
                return rcall;
            };

            // FIXME:
            // `rendercalls` will be copied (shallow)
            // all render functions shall not modify deeper level.
            return rendercalls => {
                var calls = Object.assign([], rendercalls);
                calls.sort((a, b) => a.z - b.z);    // z-sorting
                calls = fn.flatmap(calls, clip);    // clipping and fading
                calls = phase(renderers.hl, calls); // render to low-level primitives
                calls = phase(renderers.ll, calls); // render to (almost) drawcalls
                calls.forEach(call => call.color = call.color.format());    // format colors to get proper drawcalls
                return calls;
            };
        })();

        // invoker
        return scene => render(scene);
    };
});

