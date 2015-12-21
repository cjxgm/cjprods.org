'use strict';
// camera lens

define(['fn'], (fn) => {
    var blind_distance = 0.1;                       // starting to get transparent
    var depth_of_field = { near: 0.5, far: 2 };     // for out-of-focus effect

    return (fov, xbound, ybound) => {
        //---- perspective transformation
        var screen_to_world = (t => z => -z*t)(Math.tan(fn.radians(fov / 2)));

        //---- out-of-focus / field effect
        var field = z => {  // z <= 0
            var d = -z;     // distance to camera

            var blur = 0;
            if (d < depth_of_field.near) blur = fn.unlerp(d, depth_of_field.near, 0);
            if (d > depth_of_field.far)  blur = Math.min(1, fn.unlerp(d-depth_of_field.far, 0, depth_of_field.near));

            var alpha = fn.lerp(blur, 1, 0.7);
            if (d < blind_distance) alpha *= d / blind_distance;    // more numerically-stable than Math.min method

            return { alpha, blur };
        };

        //---- rotation
        var rotate = angle => {
            angle = Math.max(-90, Math.min(90, angle));
            angle = fn.radians(angle);
            var aa = Math.abs(angle);
            var scale = Math.cos(aa) + Math.sin(aa) * Math.max(xbound/ybound, ybound/xbound);
            return { angle, scale };
        };

        return { screen_to_world, field, rotate };
    };
});

