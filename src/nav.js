'use strict';

define(['fn'], (fn) => {
    return (ul, pages, request_render) => {
        var next_target = null;
        var target = null;
        var active = null;
        var time = 0;
        var start_time;
        var   end_time;
        var start_frame_time;
        var   end_frame_time;
        var frame_time = 0;

        var go = page => {
            if (page === active && target == null) return;
            next_target = page;
            location.hash = `#${page.name}`;
            request_render();
        };

        var page_by_name = name => {
            var page = pages.find(page => page.name === name);
            if (page == null) {
                console.error(`no such page: ${name}`);
                return;
            }
            return page;
        };

        var frame = ms => {
            frame_time = ms;

            if (next_target != null) {
                var time_limit = 20;
                if (next_target === target) time_limit = 1;

                if (target != null) target.nav.classList.remove('target');
                target = next_target;
                next_target = null;
                target.nav.classList.add('target');

                start_time = time;
                  end_time = target.target_time;
                start_frame_time = frame_time;
                  end_frame_time = start_frame_time + Math.min(time_limit, Math.abs(end_time - start_time));
            }

            if (target != null) {
                var t = Math.min(1, fn.unlerp(frame_time, start_frame_time, end_frame_time));
                time = fn.lerp(fn.smoothstep(t), start_time, end_time);

                if (frame_time > end_frame_time) {  // reached
                    if (active != null) active.nav.classList.remove('active');

                    time = end_time;
                    active = target;
                    target = null;
                    active.nav.classList.remove('target');
                    active.nav.classList.add('active');

                    // fire once is enough
                    ul.classList.remove('hide');
                    localStorage.visited = "";
                }
                return time;
            }
            return null;
        };

        var make_nav_item = page => {
            var e = document.createElement('li');
            e.textContent = page.name.toUpperCase();
            page.nav = e;
            e.addEventListener('click', () => go(page));
            return e;
        };
        pages.map(make_nav_item).forEach(item => ul.appendChild(item));


        window.addEventListener('hashchange', () => {
            var hash = location.hash.substr(1);
            if (target != null && target.name === hash) return;
            go(page_by_name(hash));
        });

        if (location.hash) {
            var hash = location.hash.substr(1);
            var page = page_by_name(hash);
            go(page);
            if (localStorage.visited != null) target = page;    // fast forward
        }
        else go(pages[0]);

        return frame;
    };
});

