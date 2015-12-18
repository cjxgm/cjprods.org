'use strict';
// functional programming utilities (including some math utilities)

define(() => {
    let _ = {};

    // .each :: array e -> (e -> <number> -> <a>) -> <a>
    // .each :: map k v -> (v -> <k>      -> <a>) -> <a>
    _.each = (iterable, visit) => {
        for (let key in iterable) {
            let x = visit(iterable[key], key);
            if (x != null) return x;
        }
    };

    // y == .lerp(x, a, b) <=> x == .unlerp(y, a, b)
    _.lerp = (x, a, b) => a + (b-a)*x;
    _.unlerp = (y, a, b) => (y-a) / (b-a);
    _.relerp = (x, a0, b0, a1, b1) => _.lerp(_.unlerp(x, a0, b0), a1, b1);

    return _;
});

