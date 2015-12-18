"use strict";

define(() => {
    return (a) => {
        a = parseInt(a);
        a = (a ^ 61) ^ (a >> 16);
        a = a + (a << 3);
        a = a ^ (a >> 4);
        a = a * 0x27d4eb2d;
        a = a ^ (a >> 15);
        return 2 * ((a / 0x7fffffff) - 0.5);
    };
});

