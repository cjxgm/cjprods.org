'use strict';

define(['fokree', 'mountain', 'cliff', 'manipulator', 'scenegraph'],
       (fkr, mt, cliff, manip, sg) => {
    window.sg = sg;
    var render;
    var cam = { x: 0, y: 0, z: 0, fov: 90 };
    var clear;
    var drawcalls;
    var update = (time, xbound, ybound) => {
        console.log('update');
        drawcalls = sg(cam.fov, xbound, ybound)([{
            name: 'cliff',
            x: -cam.x,
            y: -cam.y,
            z: -cam.z,
            color: 'blue',
        }]);
        clear = { x: xbound, y: ybound, style: '#DDD' }
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
            // TODO
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
    };

    var draw = (ctx, next) => {
        console.log('draw');
        window.next = next; // FIXME: remove this
        window.ctx = ctx; // FIXME: remove this
        render = next;

        // TODO
        ctx.fillStyle = clear.style;
        ctx.fillRect(-clear.x, -clear.y, clear.x*2, clear.y*2);

        drawcalls.forEach(dcall => drawers[dcall.name](dcall));
    };

    var cam_update = () => {
        var x = parseFloat(input_x.value);
        var y = parseFloat(input_y.value);
        var z = parseFloat(input_z.value);
        var fov = parseFloat(input_fov.value);
        cam = { x, y, z, fov };
        render();
    };
    input_x.oninput = input_y.oninput = input_z.oninput = input_fov.oninput = cam_update;

    var canvas = document.querySelector('canvas');
    fkr.canvas(canvas, update, draw);
});

