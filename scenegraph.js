'use strict';

define(['color', 'fn', 'cliff', 'mountain', 'firefly'], (clr, fn, cliff, mt, ffly) => {
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

                firefly (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var wxbound = lens.xbound * to_world;   // world x bound
                    var wybound = lens.ybound * to_world;   // world y bound
                    var data = ffly(-rcall.x-wxbound, -rcall.x+wxbound, rcall.height, rcall.spread)
                                .map(p => ({
                                    x: p.x + rcall.x,
                                    y: p.y + rcall.y,
                                }));
                    return {
                        name: 'dots',
                        data,
                        z: rcall.z,
                        color: rcall.color,
                        radius: 0.04,
                    };
                },
            };

            renderers.ll = {
                polygon (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => fn.vmap(world, x => x * to_screen));
                    var dcalls = [];
                    var field = lens.field(rcall.z);
                    dcalls.push({
                        name: 'polygon',
                        data,
                        color: rcall.color,
                    });
                    if (field.blur)
                        dcalls.push({
                            name: 'line',
                            data,
                            color: rcall.color.alpha(field.blur_alpha),
                            width: field.blur * to_screen,
                        });
                    return dcalls;
                },

                dots (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => fn.vmap(world, x => x * to_screen));
                    var field = lens.field(rcall.z);
                    var dcall = {
                        name: 'dots',
                        data,
                        color: rcall.color,
                        radius: rcall.radius * to_screen,
                    };
                    if (field.blur) {
                        dcall.radius += field.blur * 0.05 * to_screen;
                        dcall.color = dcall.color.brighten(
                                fn.lerp(field.blur_alpha, 0.8, 0))
                            .alpha(fn.lerp(field.blur_alpha, 0.5, 1));
                    }
                    return dcall;
                },
            };

            var clip = rcall => {
                if (rcall.z >= 0) return [];
                rcall.color = rcall.color.alpha(lens.field(rcall.z).alpha); // blind spot
                rcall.color = lens.fog(rcall.color, rcall.z);               // foggy
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

