'use strict';

define(['fn'], (fn) => {
    // canvas
    //      :: canvas-element
    //      -> ((number `xbound`, number `ybound`) -> ()) `update`
    //      -> (canvas-context-2d -> (() -> ()) `next` -> ()) `draw`
    //      -> number? `ups`
    //      -> ()
    var canvas = (element, update, draw, ups) => {  // ups: update per second
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

        var resize = () => (bound = setup(), next());
        return resize;
    };


    var ctx;    // populated later
    var draws = {
        clear (dcall) {
            ctx.fillStyle = dcall.color;
            ctx.fillRect(-dcall.xbound, -dcall.ybound, dcall.xbound*2, dcall.ybound*2);
        },

        rotate (dcall) {
            this.rotation = dcall.rotation
            ctx.rotate(dcall.rotation.angle);
            ctx.scale(dcall.rotation.scale, dcall.rotation.scale);
        },

        line (dcall) {
            var line = fn.initiator(
                    p => ctx.moveTo(p.x, p.y),
                    p => ctx.lineTo(p.x, p.y));
            ctx.beginPath();
            dcall.data.forEach(p => line(p));

            ctx.strokeStyle = dcall.color;
            ctx.lineWidth   = dcall.width;
            ctx.stroke();
        },

        polygon (dcall) {
            var line = fn.initiator(
                    p => ctx.moveTo(p.x, p.y),
                    p => ctx.lineTo(p.x, p.y));
            ctx.beginPath();
            dcall.data.forEach(p => line(p));
            ctx.closePath();

            ctx.fillStyle = dcall.color;
            ctx.fill();
        },

        dots (dcall) {
            ctx.fillStyle = dcall.color;
            ctx.strokeStyle = dcall.color;
            ctx.lineWidth = dcall.radius*2;
            dcall.data.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, dcall.radius, 0, 2*Math.PI);
                ctx.closePath();
                ctx.fill();
            });
        },

        lines (dcall) {
            ctx.strokeStyle = dcall.color;
            ctx.lineWidth = dcall.width;
            dcall.data.forEach(p => {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + dcall.dir.x, p.y + dcall.dir.y);
                ctx.stroke();
            });
        },

        dom (dcall) {
            if (this.dom_cache == null) this.dom_cache = {};
            if (fn.same(this.dom_cache[dcall.element.id], dcall)) return;
            this.dom_cache[dcall.element.id] = dcall;

            var pstyle = dcall.element.parentElement.style;
            pstyle.opacity = dcall.a;
            if (dcall.a === 0) {
                pstyle.visibility = 'hidden';
                return;
            }
            pstyle.visibility = 'visible';

            var style = dcall.element.style;
            style.color = dcall.color;
            style.transform = `scale(${this.rotation.scale}) translate(${dcall.x}vmin, ${dcall.y}vmin) rotate(${-this.rotation.angle}rad)`;
            if (dcall.blur == null)
                pstyle['filter'] = pstyle['-webkit-filter'] = "";
            else {
                var blur = Math.min(dcall.blur, 15);
                pstyle['filter'] = pstyle['-webkit-filter'] = `blur(${blur}px)`;
            }

            for (var i in dcall.size) {
                var s = dcall.size[i];
                style[s.name] = `${s.value}vmin`;
            }
        },

        safe_frame (dcall) {
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
            // tri-guides
            ctx.strokeStyle = "#66F";
            ctx.lineWidth = 0.005;
            ctx.strokeRect(-dcall.xbound, -dcall.ybound/3, 2*dcall.xbound, dcall.ybound/3*2);
            ctx.strokeRect(-dcall.xbound/3, -dcall.ybound, dcall.xbound/3*2, 2*dcall.ybound);
        },
    };

    var draw = (ctx_, dcall) => {
        ctx = ctx_;
        draws[dcall.name](dcall);
    };

    return { canvas, draw };
});

