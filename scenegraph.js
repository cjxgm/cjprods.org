'use strict';

define([
    'color', 'random', 'fn', 'lens',
    'cliff', 'mountain', 'firefly', 'rain', 'bokeh',
    'landscape',
], (clr, rand, fn, make_lens, cliff, mt, make_firefly, make_rain, make_bokeh, make_landscape) => {
    return () => {
        //---- apply
        // return rendercalls, lens, rot and color
        var apply = (() => {
            var appliers = {
                landscape (node) {
                    return make_landscape(node.x, node.y, node.z, node.color);
                },
                firefly (node, time, lens) {
                    return make_firefly(node.x, node.y, node.z, lens, node.color, node.working)
                            .map(x => x.sample(time));
                },
                rain (node, time, lens) {
                    return make_rain(node.x, node.y, node.z, lens, node.color, node.working)
                            .map(x => x.sample(time));
                },
                bokeh (node, time, lens) {
                    var rcall = make_bokeh(lens, node.working).map(x => x.sample(time));
                    rcall.clipfree = true;
                    return rcall;
                },
                dom (node, time) {
                    node.clipfree = true;
                    return node;
                },
            };

            return (scene, xbound, ybound) => {
                var lens = make_lens(scene.fov, xbound, ybound, scene.fog_color);
                var rot  = lens.rotate(scene.rot);

                // sanitize nodes
                var defaults = {
                    x: 0,
                    y: 0,
                    z: 0,
                    color: clr.rgb(0,0,0),
                };
                var rcalls = scene.data.map(node => Object.assign({}, defaults, node));

                // apply color masking
                if (scene.mask.a)
                    rcalls.forEach(node => {
                        node.color = node.color.mix(
                            scene.mask.of({ a: 1 }),
                            scene.mask.a);
                    });

                // apply camera position
                rcalls.forEach(node => {
                    node.x -= scene.x;
                    node.y -= scene.y;
                    node.z -= scene.z;
                });

                // generate rendercalls
                rcalls = fn.flatmap(rcalls,
                                    node => appliers[node.name](node, scene.time, lens))
                            .filter(x => x != null);

                return { rcalls, lens, rot, sky_color: scene.sky_color };
            };
        })();


        //---- render
        var render = (() => {
            var lens;   // populated later

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

                bokeh (rcall) {
                    var to_world = lens.screen_to_world(-1);
                    return {
                        name: 'dots',
                        data: [{ x: rcall.x * to_world, y: rcall.y * to_world }],
                        color: clr.rgba(1,1,1,rcall.a),
                        radius: rcall.radius * to_world,
                        z: -1,
                    };
                },

                firefly (rcall) {
                    return {
                        name: 'dots',
                        data: [{ x: rcall.x, y: rcall.y }],
                        color: rcall.color.alpha(rcall.a),
                        radius: rcall.radius,
                        z: rcall.z,
                    };
                },

                rain (rcall) {
                    return {
                        name: 'lines',
                        data: [{ x: rcall.x, y: rcall.y }],
                        color: rcall.color.alpha(rcall.a),
                        width: rcall.width,
                        angle: rcall.angle,
                        length: rcall.length,
                        z: rcall.z,
                    };
                },

                dom (rcall) {
                    return rcall;
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
                        var a = (field.blur < 0.9
                            ? fn.relerp(field.blur, 0, 0.9, 1, 0.8)
                            : fn.relerp(field.blur, 0.9, 1, 0.8, 0));
                        dcall.color = dcall.color.brighten(
                                fn.lerp(field.blur_alpha, 0.8, 0))
                            .alpha(a);
                    }
                    return dcall;
                },

                lines (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => fn.vmap(world, x => x * to_screen));
                    var field = lens.field(rcall.z);
                    var dir = {
                        x: Math.cos(rcall.angle) * rcall.length * to_screen,
                        y: Math.sin(rcall.angle) * rcall.length * to_screen,
                    };
                    var dcall = {
                        name: 'lines',
                        data,
                        color: rcall.color,
                        width: rcall.width * to_screen,
                        dir,
                    };
                    if (field.blur) {
                        dcall.width += field.blur * 0.2 * to_screen;
                        var a = (field.blur < 0.5
                            ? fn.relerp(field.blur, 0, 0.5, 1, 0.7)
                            : fn.relerp(field.blur, 0.5, 1, 0.7, 0));
                        dcall.color = dcall.color.alpha(a);
                    }
                    return dcall;
                },

                dom (rcall) {
                    if (rcall.z >= 0)
                        return {
                            name: 'dom',
                            element: rcall.element,
                            a: 0,
                            color: rcall.color,
                        };

                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var to_viewport = to_screen * 50;
                    var field = lens.field(rcall.z);
                    rcall.size.forEach(x => x.value *= to_viewport);
                    var dcall = {
                        name: 'dom',
                        element: rcall.element,
                        x:  rcall.x * to_viewport,
                        y: -rcall.y * to_viewport,
                        a: rcall.a,
                        color: rcall.color,
                        size: rcall.size,
                    };
                    if (field.blur) {
                        // dom blur is in `px` unit.
                        dcall.blur = field.blur * 0.1 * to_viewport;
                        var a = (field.blur < 0.6
                            ? fn.relerp(field.blur, 0, 0.6, 1, 0.8)
                            : fn.relerp(field.blur, 0.6, 1, 0.8, 0));
                        dcall.a *= a;
                        dcall.color = dcall.color.brighten(
                                fn.lerp(field.blur_alpha, 0.8, 0));
                    }
                    return dcall;
                },
            };

            var clip = rcall => {
                if (rcall.clipfree) return rcall;
                if (rcall.z > 0) return [];
                rcall.color = rcall.color.alpha(lens.field(rcall.z).alpha); // blind spot
                rcall.color = lens.fog(rcall.color, rcall.z);               // foggy
                return rcall;
            };

            return applied => {
                lens = applied.lens;

                var calls = applied.rcalls;
                calls.sort((a, b) => a.z - b.z);    // z-sorting
                calls = fn.flatmap(calls, clip);    // clipping and fading
                calls = phase(renderers.hl, calls); // render to low-level primitives
                calls = phase(renderers.ll, calls); // render to (almost) drawcalls
                calls.unshift({                     // add in "clear" call
                    name: 'clear',
                    color: applied.sky_color,
                    xbound: applied.lens.xbound,
                    ybound: applied.lens.ybound
                });
                calls.forEach(call => call.color = call.color.format());    // format colors to get proper drawcalls
                calls.unshift({ name: 'rotate', rotation: applied.rot });   // add in "rotate" call
                return calls;
            };
        })();

        // invoker
        return (scene, xbound, ybound) => render(apply(scene, xbound, ybound));
    };
});

