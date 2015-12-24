'use strict';
// functional programming utilities (including some math utilities)

define({
    // y == .lerp(x, a, b) <=> x == .unlerp(y, a, b)
    lerp (x, a, b) { return a + (b-a)*x },
    unlerp (y, a, b) { return (y-a) / (b-a) },
    relerp (x, a0, b0, a1, b1) { return this.lerp(this.unlerp(x, a0, b0), a1, b1) },

    clamp (x, a, b) { return Math.min(b, Math.max(a, x)) },
    radians (deg) { return deg / 180 * Math.PI },
    mod (x, y) { return (x%y + y) % y },
    smoothstep (x) { return x * x * (3 - 2*x) }, // smoothstep = 3 x^2 - 2 x^3

    flatten (array) { return [].concat(...array) },
    flatmap (array, f) { return this.flatten(array.map(f)) },
    vmap (kv, f) {
        var result = {};
        for (var k in kv) result[k] = f(kv[k], k);
        return result;
    },

    initiator (first, rest) {
        var call = (...args) => {
            var result = first(...args);
            call = (...args) => rest(...args);
            return result;
        }
        return (...args) => call(...args);
    },
});

