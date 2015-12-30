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

    is_object (x) { return x instanceof Object && x.constructor === Object },
    same (a, b) {
        if (a === b) return true;

        var arra = a instanceof Array;
        var arrb = b instanceof Array;
        if (arra && arrb) {
            if (a.length !== b.length) return false;
            for (var i in a)
                if (!this.same(a[i], b[i]))
                    return false;
            return true;
        }
        if (arra || arrb) return false;

        var obja = this.is_object(a);
        var objb = this.is_object(b);
        if (obja && objb) {
            var keysa = Object.getOwnPropertyNames(a);
            var keysb = Object.getOwnPropertyNames(b);
            if (keysa.length !== keysb.length) return false;

            keysa = keysa.sort();
            keysb = keysb.sort();
            for (var i in keysa)
                if (keysa[i] !== keysb[i])
                    return false;

            for (var k in a)
                if (!this.same(a[k], b[k]))
                    return false;

            return true;
        }
        if (obja || objb) return false;

        return false;
    },
});

