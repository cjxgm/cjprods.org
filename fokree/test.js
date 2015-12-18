'use strict';

define(['fokree'], fkr => {
    var update = (time,xbound, ybound) => {
        console.log('update');
    };
    var draw = (ctx, next) => {
        window.next = next;
        console.log('draw');
        ctx.fillRect(-0.5, -0.5, 1, 0.5);
    };

    setTimeout(() =>
        fkr.canvas(document.querySelector('canvas'), update, draw),
        1000);
});

