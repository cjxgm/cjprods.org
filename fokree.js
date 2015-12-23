'use strict';

define({
    // canvas
    //      :: canvas-element
    //      -> ((number `xbound`, number `ybound`) -> ()) `update`
    //      -> (canvas-context-2d -> (() -> ()) `next` -> ()) `draw`
    //      -> number? `ups`
    //      -> ()
    canvas (element, update, draw, ups) {   // ups: update per second
        // sanitize arguments
        if (ups == null) ups = 30;

        // initialize canvas
        var ctx = element.getContext('2d');
        var mspu = parseInt(1000 / ups);

        var start_time;
        var last_time;
        requestAnimationFrame(ms => {
            start_time = ms;
            last_time = start_time - mspu;
        });

        var setup = () => {
            var w = element.width;
            var h = element.height;

            // setup coordinate system
            // - bound: [-xbound, xbound] × [-ybound, ybound]
            //          assert(xbound === 1 || ybound === 1)
            // - safe-bound: [-1, 1] × [-1, 1]
            // - origin: (0, 0) center of canvas
            // - x-axis: west -1, east 1
            // - y-axis: south -1, north 1
            var xbound = (w < h ? 1 : w / h);
            var ybound = (w < h ? h / w : 1);
            ctx.setTransform(w/2 / xbound,    0         ,       // x-axis
                               0         , -h/2 / ybound,       // y-axis
                             w/2         ,  h/2         );      // origin
            return { x: xbound, y: ybound };
        };
        var bound = setup();

        // render loop
        var rendering = false;
        var next = () => {
            if (rendering) return;
            rendering = true;
            requestAnimationFrame(render);
        }
        var render = ms => {
            rendering = false;

            // update
            if (ms - last_time >= mspu) {
                update(ms-start_time, bound.x, bound.y);
                last_time = ms;
            }

            // draw
            draw(ctx, next);
        };

        // bootstrap
        next();

        var resize = () => bound = setup();
        return resize;
    },
});

