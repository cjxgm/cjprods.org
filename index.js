'use strict';

define([
    'fokree', 'scenegraph',
    'fap', 'scene',
    'ajax',
], (fkr, scenegraph, fap, make_scene, ajax) => {
    window.sg = scenegraph;
    window.fap = fap;
    window.ajax = ajax;

    var request_render = () => {};
    var drawcalls;
    var safe_frame = false;
    var play = fap.state(false);
    var play_edge = play.edge(false);

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
        play.set(ev.target.checked);
        request_render();
    });
    input_safe.addEventListener('change', ev => {
        safe_frame = ev.target.checked;
        request_render();
    });

    var loaded = pages => {
        console.log(pages);
        var scene = make_scene(states, pages);
        window.scene = scene;

        var sg_render = scenegraph();
        var start_time = 0;
        var update = (time, xbound, ybound) => {
            console.log('update');
            drawcalls = sg_render(scene.sample(states.time.sample(time)), xbound, ybound);

            if (play_edge.sample(time))
                start_time = time / 1000 - input_time.value;
            if (play.sample(time)) {
                input_time.value = (time / 1000 - start_time) % 60;
                input_time.dispatchEvent(new Event('input'));
            }
        };

        var draw = (ctx, next) => {
            console.log('draw');
            window.next = next; // FIXME: remove this
            window.ctx = ctx; // FIXME: remove this
            request_render = next;

            if (play.sample(0)) next();

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

        document.querySelector('.dom-canvas > .loading').classList.add('done');
    };

    var ok = pages => {
        var nload = 0;
        var dom_canvas = document.querySelector('.dom-canvas');
        var loading = document.querySelector('.dom-canvas > .loading');
        pages.forEach((page, i) => {
            var e = document.createElement('div');
            e.textContent = `Loading ${page.name}...`;
            loading.appendChild(e);
            var pfail = err => e.textContent = `error loading ${page.url}: ${err}`;
            var pload = p => {
                var section = p.querySelector('section');
                if (section == null) return pfail('bad document');

                // title
                var wrapper = document.createElement('div');
                var element = document.createElement('div');
                wrapper.setAttribute("class", "wrapper");
                element.setAttribute("class", "title");
                element.setAttribute("id", `${page.name}-title`);
                element.textContent = page.name.toUpperCase();
                wrapper.appendChild(element);
                dom_canvas.appendChild(wrapper);
                page.title.element = element;

                // content
                wrapper = document.createElement('div');
                element = document.createElement('div');
                wrapper.setAttribute("class", "wrapper");
                element.setAttribute("class", "content");
                element.setAttribute("id", `${page.name}-content`);
                element.appendChild(section);
                wrapper.appendChild(element);
                dom_canvas.appendChild(wrapper);
                page.content.element = element;

                e.parentElement.removeChild(e);
                if (++nload === pages.length) loaded(pages);
            }
            ajax.html(page.url, pload, pfail);
        });
    };
    var fail = err => document.querySelector('.dom-canvas > .loading').textContent = `error: ${err}`;
    ajax.get_json("./content.json", null, ok, fail);
});

