'use strict';

define(['manipulator', 'mountain', 'cliff'], (manip, mt, cliff) => {
    // high-level transformation
    manip.register(0, 'move', manip.simple('obj', (tree, sub) => {
        sub.x += tree.x;
        sub.y += tree.y;
        sub.z += tree.z;
        return sub;
    }));

    // high-level primitive -> low-level primitive
    manip.register(1, 'mountain', (tree, manipulate) => {
    });

    manip.register(1, 'cliff', (tree, manipulate) => {
    });

    return (obj, persp) => {
    };
});

