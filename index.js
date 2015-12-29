'use strict';

require.config({
    waitSeconds: 0,
});

define([
    'fokree', 'scenegraph',
    'fap', 'scene', 'fn',
    'ajax', 'nav', 'color',
], (fkr, scenegraph, fap, make_scene, fn, ajax, nav, clr) => {
    var request_render = () => {};
    var render_next = false;
    var drawcalls;
    var safe_frame = false;

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
            request_render();
        };

        states[input] = state;
        ctrls.forEach(e => e.addEventListener('input', update));
        update();
    });
    input_safe.addEventListener('change', ev => {
        safe_frame = ev.target.checked;
        request_render();
    });

    var loaded = (keyframes, pages, clusters) => {
        var scene = make_scene(states, keyframes, pages, clusters);
        var nav_frame = nav(
            document.querySelector('header > nav > ul'),
            pages.filter(p => p.url != null),
            () => request_render());

        var sg_render = scenegraph();
        var start_time = 0;
        var update = (time, xbound, ybound) => {
            var s = scene.sample(states.time.sample(0));
            drawcalls = sg_render(s, xbound, ybound);
            if (safe_frame)
                drawcalls.push({
                    name: 'safe_frame',
                    xbound,
                    ybound,
                });

            // update disp value based on scene animation
            for (var k in s) {
                var disp = document.querySelector(`div.display div[${k}]`);
                if (disp == null) continue;
                disp.textContent = `${k}: ${s[k].toFixed(3)}`;
            }

            time = nav_frame(time / 1000);
            render_next = (time != null);
            if (time != null) {
                input_time.value = time;
                input_time.dispatchEvent(new Event('input'));
            }
        };

        var draw = (ctx, next) => {
            request_render = next;
            if (render_next) next();
            drawcalls.forEach(dcall => fkr.draw(ctx, dcall));
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

    var content_ok = content => {
        var keyframes = fn.vmap(content.keyframes, spec => fap.tween(spec));
        var pages = content.pages;
        var clusters = content.clusters;
        clusters.forEach(c => c.color = clr.hex(c.color));

        var dom_canvas = document.querySelector('.dom-canvas');
        var loading_container = document.querySelector('.dom-canvas > .loading');

        var populate_page = (page, html) => {
            // title
            var wrapper = document.createElement('div');
            var element = document.createElement('div');
            wrapper.setAttribute("class", "wrapper");
            element.setAttribute("class", "title");
            element.setAttribute("id", `${page.name}-title`);
            element.textContent = (html ? page.name.toUpperCase() : page.name);
            wrapper.appendChild(element);
            dom_canvas.appendChild(wrapper);
            page.title.element = element;

            // content
            if (html) {
                wrapper = document.createElement('div');
                element = document.createElement('div');
                wrapper.setAttribute("class", "wrapper");
                element.setAttribute("class", "content");
                element.setAttribute("id", `${page.name}-content`);
                element.appendChild(html);
                wrapper.appendChild(element);
                dom_canvas.appendChild(wrapper);
                page.content.element = element;
            }
        };

        var nload = 0;
        pages.filter(page => page.url == null).forEach(page => {
            populate_page(page);
            if (++nload === pages.length) loaded(keyframes, pages, clusters);
        });
        pages.filter(page => page.url != null).forEach(page => {
            var loading = document.createElement('div');
            loading.textContent = `Loading ${page.name}...`;
            loading_container.appendChild(loading);

            var page_fail = err => loading.textContent = `error loading ${page.url}: ${err}`;
            var page_ok = html => {
                var section = html.querySelector('section');
                if (section == null) return page_fail('bad document');
                populate_page(page, section);

                loading.parentElement.removeChild(loading);
                if (++nload === pages.length) loaded(keyframes, pages, clusters);
            }
            ajax.html(page.url, page_ok, page_fail);
        });
    };
    var content_fail = err => document.querySelector('.dom-canvas > .loading').textContent = `error: ${err}`;
    ajax.get_json("./content.json", null, content_ok, content_fail);
});

