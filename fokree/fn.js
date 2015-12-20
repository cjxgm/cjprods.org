'use strict';
// functional programming utilities (including some math utilities)

define(() => {
    var _ = {};

    // y == .lerp(x, a, b) <=> x == .unlerp(y, a, b)
    _.lerp = (x, a, b) => a + (b-a)*x;
    _.unlerp = (y, a, b) => (y-a) / (b-a);
    _.relerp = (x, a0, b0, a1, b1) => _.lerp(_.unlerp(x, a0, b0), a1, b1);

    _.clamp = (x, a, b) => Math.min(b, Math.max(a, x))

    return _;
});

