'use strict';

define(['color', 'fn'], (clr, fn) => {
    return (states) => {
        var hello = fap.state(true);
        var raining = fap.state(false);
        var lightning = fap.zip((raining, raining_edge, random) =>
                            raining && (raining_edge || random),
            raining,
            raining.edge(false).resample(2),
            fap.random.stretch(1/7184).map(x => x > 0.9 || x < -0.9).resample(1));
        window.raining = raining;
        window.hello = hello;

        var lightning_anim = fap.zip((a, b) => a*b,
                fap.wiggle.stretch(1 / 20).map(x => fn.relerp(x, -1, 1, 0.5, 1)),
                lightning.smoothswitch().stretch(0.4));
        var raining_anim = raining.smoothswitch().stretch(0.5);

        // prepare colors
        var colors = {};

        // TODO: title text color: 83CFEC
        colors.sky = {
            normal: clr.hex('#0075A2'),
            raining: clr.hex('#001F58'),
            lightning: clr.hex('#BE3FFF'),
        };
        colors.fog = colors.sky;

        colors.landscape = {
            normal: clr.hex('#03202B'),
            raining: clr.hex('#01141B'),
        };
        colors.landscape.lightning = colors.landscape.raining;

        var changing_color = colors => fap.zip(
            (base, a) => base.mix(colors.lightning, a),
            raining_anim.map(a => colors.normal.mix(colors.raining, a)),
            lightning_anim);

        var sky_color = changing_color(colors.sky);
        var fog_color = changing_color(colors.fog);
        var landscape_color = changing_color(colors.landscape);
        var mask = lightning_anim.map(a => clr.rgba(0, 0, 0, a));

        // scene animation
        return fap.actor('scene', {
            time: states.time,

            // camera
            x: states.x,
            y: states.y,
            z: states.z,
            fov: states.fov,
            rot: states.rot,

            // color
            sky_color,
            fog_color,
            mask,

            // scene description
            data: [
                fap.actor('landscape', {
                    color: landscape_color,
                }),
                fap.actor('firefly', {
                    color: clr.hex('#85FF00').alpha(0.8),
                    working: raining.map(x => !x),
                }),
                fap.actor('rain', {
                    color: clr.rgba(1,1,1,0.8),
                    working: raining,
                }),
                fap.actor('bokeh', {
                    working: raining,
                }),
                fap.actor('dom', {
                    element: document.querySelector('.dom-canvas > .wrapper > #home'),
                    color: clr.hex("#83CFEC"),
                    a: hello.smoothswitch().stretch(0.2),
                    z: 0.4,
                    size: [
                        fap.actor('font-size', {
                            value: 0.1,
                        }),
                    ],
                }),
                fap.actor('dom', {
                    element: document.querySelector('.dom-canvas > .wrapper > #home-content'),
                    color: clr.hex("#83CFEC").brighten(0.5),
                    a: hello.smoothswitch().stretch(0.5),
                    x: 1.0,
                    y: -0.4,
                    z: 0.2,
                    size: [
                        fap.actor('font-size', { value: 0.05 }),
                        fap.actor('width', { value: 2 }),
                        fap.actor('height', { value: 1 }),
                    ],
                }),
            ],
        });
    };
});

