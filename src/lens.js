'use strict';
// camera lens

define(['fn'], (fn) => {
    var blind_distance = 0.2;                                   // starting to get transparent
    var fog_distance = 20;
    var depth_of_field = { near: 1, far: 14, far_depth: 4 };        // for out-of-focus effect

    return (fov, xbound, ybound, fog_color) => {
        //---- perspective transformation
        var screen_to_world = (t => z => -z*t)(Math.tan(fn.radians(fov / 2)));

        //---- out-of-focus / field effect
        var field = z => {  // z <= 0
            var d = -z;     // distance to camera

            var alpha = 1;
            if (d < blind_distance) alpha *= d / blind_distance;    // more numerically-stable than Math.min method

            var blur = 0;
            var blur_alpha = 1;
            if (d < depth_of_field.near) {
                blur = fn.unlerp(d, depth_of_field.near, 0);
                alpha *= fn.lerp(blur, 1, 0.95);
                blur_alpha = 1 - blur;
            }
            if (d > depth_of_field.far) {
                blur = Math.min(1, fn.unlerp(d-depth_of_field.far, 0, depth_of_field.far_depth));
                alpha *= fn.lerp(blur, 1, 0.7);
                blur_alpha = alpha*alpha;
            }
            blur *= blur;

            return { alpha, blur, blur_alpha };
        };

        //---- rotation
        var rotate = angle => {
            angle = Math.max(-90, Math.min(90, angle));
            angle = fn.radians(angle);
            var aa = Math.abs(angle);
            var scale = Math.cos(aa) + Math.sin(aa) * Math.max(xbound/ybound, ybound/xbound);
            return { angle, scale };
        };

        //---- fogging
        var fog = (color, z) => {
            var d = -z;     // distance to camera
            var k = Math.min(1, fn.unlerp(d, 0, fog_distance));
            k = Math.pow(k, 1.2);
            return color.mix(fog_color, k);
        };

        return { xbound, ybound, screen_to_world, field, rotate, fog };
    };
});

