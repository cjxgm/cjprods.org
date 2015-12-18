'use strict';

define(['fokree', 'mountain'], (fkr, mt) => {
    var render;
    var cam_input = { x: 0, y: 0, z: 0 };
    var cam;
    var clear;
    var mount;
    var update = (time, xbound, ybound) => {
        console.log('update');
        cam = cam_input;
        mount = mt(-xbound+cam.x, xbound+cam.x);
        mount.unshift({ x: -xbound+cam.x, y: -ybound+1+cam.y });
        mount.push({ x: xbound+cam.x, y: -ybound+1+cam.y });
        clear = { x: xbound, y: ybound, style: '#DDD' }
    };
    var draw = (ctx, next) => {
        console.log('draw');
        window.next = next; // FIXME: remove this
        window.ctx = ctx; // FIXME: remove this
        render = next;

        // TODO
        ctx.fillStyle = clear.style;
        ctx.fillRect(-clear.x, -clear.y, clear.x*2, clear.y*2);

        ctx.fillStyle = 'black';
        ctx.fillRect(-0.5-cam.x, -0.5-cam.y, 1, 0.5);

        ctx.beginPath();
        var a = mount.shift();
        ctx.moveTo(a.x-cam.x, a.y-1-cam.y);
        mount.forEach(m => ctx.lineTo(m.x-cam.x, m.y-1-cam.y));
        mount.unshift(a);
        ctx.fillStyle = 'blue';
        ctx.fill();
    };

    var cam_update = () => {
        var x = parseFloat(input_x.value);
        var y = parseFloat(input_y.value);
        var z = parseFloat(input_z.value);
        cam_input = { x, y, z };
        render();
    };
    input_x.oninput = input_y.oninput = input_z.oninput = cam_update;

    var canvas = document.querySelector('canvas');
    fkr.canvas(canvas, update, draw);
});

