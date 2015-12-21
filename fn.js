'use strict';
// functional programming utilities (including some math utilities)

define({
    // y == .lerp(x, a, b) <=> x == .unlerp(y, a, b)
    lerp (x, a, b) { return a + (b-a)*x },
    unlerp (y, a, b) { return (y-a) / (b-a) },
    relerp (x, a0, b0, a1, b1) { return this.lerp(this.unlerp(x, a0, b0), a1, b1) },

    clamp (x, a, b) { return Math.min(b, Math.max(a, x)) },
    radians (deg) { return deg / 180 * Math.PI },

    flatten (array) { return [].concat(...array) },
    flatmap (array, f) { return this.flatten(array.map(f)) },
    vmap (kv, f) {
        var result = {};
        for (var k in kv) result[k] = f(kv[k], k);
        return result;
    },
});

