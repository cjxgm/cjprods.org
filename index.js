'use strict';

define([
    'fokree', 'color', 'scenegraph', 'lens',
    'landscape', 'bokeh', 'fap', 'firefly', 'rain', 'scene',
], (fkr, clr, scenegraph, lens, landscape, bokeh, fap, firefly, rain, make_scene) => {
    window.sg = scenegraph;
    window.lens = lens;
    window.fap = fap;
    window.bokeh = bokeh;
    window.color = clr;

    var request_render = () => {};
    var drawcalls;
    var safe_frame = false;
    var play = false;

    // init states and inputs
    var states = {};
    "x y z fov rot time".split(/\s+/).forEach(input => {
        var sum = (a, b) => a + b;
        var state = fap.state();
        var ctrls = Array.from(document.querySelectorAll(`div.control input[${input}]`));
        var disp = document.querySelector(`div.display div[${input}]`);

        var update = () => {
            var value = ctrls.map(e => parseFloat(e.value)).reduce(sum, 0);
            state.set(value);
            disp.textContent = `${input}: ${value.toFixed(3)}`;
            request_render();
        };

        states[input] = state;
        ctrls.forEach(e => e.addEventListener('input', update));
        update();
    });
    input_play.addEventListener('change', ev => {
        play = ev.target.checked;
        request_render();
    });
    input_safe.addEventListener('change', ev => {
        safe_frame = ev.target.checked;
        request_render();
    });

    var scene = make_scene(states);
    window.scene = scene;

    var sg_render = scenegraph();
    var update = (time, xbound, ybound) => {
        console.log('update');
        drawcalls = sg_render(scene.sample(states.time.sample(time)), xbound, ybound);

        if (play) {
            input_time.value = (time / 1000) % 60;
            input_time.dispatchEvent(new Event('input'));
        }
    };

    var draw = (ctx, next) => {
        console.log('draw');
        window.next = next; // FIXME: remove this
        window.ctx = ctx; // FIXME: remove this
        request_render = next;

        if (play) next();

        ctx.save();
        drawcalls.forEach(dcall => fkr.draw(ctx, dcall));
        if (safe_frame) {
            // big 16:9 frame
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.005;
            ctx.strokeRect(-16/9+0.01, -1+0.01, 16/9*2-0.02, 2-0.02);
            // 0.9 big 16:9 frame
            ctx.strokeStyle = "#F00";
            ctx.lineWidth = 0.01;
            ctx.strokeRect(-16/9*0.9+0.01, -0.9+0.01, 16/9*2*0.9-0.02, 1.8-0.02);
            // square frame
            ctx.strokeStyle = "#F00";
            ctx.lineWidth = 0.005;
            ctx.strokeRect(-1+0.01, -1+0.01, 2-0.02, 2-0.02);
            // 0.9 square frame
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.005;
            ctx.strokeRect(-0.9+0.01, -0.9+0.01, 1.8-0.02, 1.8-0.02);
            // 16:9 frame
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.005;
            ctx.strokeRect(-1+0.01, -9/16+0.01, 2-0.02, 9/16*2-0.02);
            // 0.9 16:9 frame
            ctx.strokeStyle = "#F00";
            ctx.lineWidth = 0.01;
            ctx.strokeRect(-0.9+0.01, -9/16*0.9+0.01, 1.8-0.02, 9/16*2*0.9-0.02);
        }
        ctx.restore();
    };

    var canvas = document.querySelector('canvas');
    var fkr_resize = fkr.canvas(canvas, update, draw);
    var resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        fkr_resize();
    };
    window.addEventListener('resize', resize);
    resize();
});

