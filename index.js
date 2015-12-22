'use strict';

define(['fokree', 'color', 'scenegraph', 'lens', 'landscape'],
       (fkr, clr, sg, lens, landscape) => {
    window.sg = sg;
    window.lens = lens;
    var render;
    var cam;
    var cam_lens;
    var cam_rot;
    var clear;
    var drawcalls;

    var update = (time, xbound, ybound) => {
        console.log('update');
        cam_lens = lens(cam.fov, xbound, ybound, clr.hex('#9700BD'));
        cam_rot  = cam_lens.rotate(cam.rot);
        drawcalls = sg(cam_lens)(landscape(-cam.x, -cam.y, -cam.z));
        clear = { x: xbound, y: ybound, style: '#9700BD' }
    };

    var initiator = (first, rest) => {
        var call = (...args) => {
            var result = first(...args);
            call = (...args) => rest(...args);
            return result;
        }
        return (...args) => call(...args);
    }

    var drawers = {
        line (dcall) {
            var line = initiator(
                    p => ctx.moveTo(p.x, p.y),
                    p => ctx.lineTo(p.x, p.y));
            ctx.beginPath();
            dcall.data.forEach(p => line(p));

            ctx.strokeStyle = dcall.color;
            ctx.lineWidth   = dcall.width;
            ctx.stroke();
        },

        polygon (dcall) {
            var line = initiator(
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
                if (dcall.radius < 0.01) {
                    ctx.beginPath();
                    ctx.moveTo(p.x - dcall.radius, p.y);
                    ctx.lineTo(p.x + dcall.radius, p.y);
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, dcall.radius, 0, 2*Math.PI);
                    ctx.closePath();
                    ctx.fill();
                }
            });
        },
    };

    var draw = (ctx, next) => {
        console.log('draw');
        window.next = next; // FIXME: remove this
        window.ctx = ctx; // FIXME: remove this
        render = next;

        ctx.save();
        ctx.rotate(cam_rot.angle);
        ctx.scale(cam_rot.scale, cam_rot.scale);

        // TODO
        ctx.fillStyle = clear.style;
        ctx.fillRect(-clear.x, -clear.y, clear.x*2, clear.y*2);

        drawcalls.forEach(dcall => drawers[dcall.name](dcall));

        if (cam.safe_frame) {
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
            ctx.strokeRect(-clear.x, -clear.y/3, 2*clear.x, clear.y/3*2);
            ctx.strokeRect(-clear.x/3, -clear.y, clear.x/3*2, 2*clear.y);
        }

        ctx.restore();
    };

    var cam_update = () => {
        var x = parseFloat(input_x.value);
        var y = parseFloat(input_y.value);
        var z = parseFloat(input_z.value);
        var fov = parseFloat(input_fov.value);
        var rot = parseFloat(input_rot.value);
        var safe_frame = input_safe.checked;
        x += parseFloat(input_x1.value);
        y += parseFloat(input_y1.value);
        z += parseFloat(input_z1.value);
        fov += parseFloat(input_fov1.value);
        rot += parseFloat(input_rot1.value);
        x += parseFloat(input_x2.value);
        y += parseFloat(input_y2.value);
        z += parseFloat(input_z2.value);
        cam = { x, y, z, fov, rot, safe_frame };
        if (render) render();
    };
    Array.from(document.querySelectorAll('section input'))
        .forEach(x => x.oninput = x.onchange = cam_update);
    cam_update();

    var canvas = document.querySelector('canvas');
    var resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        fkr.canvas(canvas, update, draw);
    };
    window.onresize = resize;
    resize();
});

