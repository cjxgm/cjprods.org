'use strict';

define(['fn'], fn => {
    function color(r, g, b, a)
    {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    Object.assign(color, {
        rgba (r, g, b, a) { return new color(r, g, b, a) },
        rgb  (r, g, b   ) { return this.rgba(r, g, b, 1) },
        hex (h) {
            if (h.startsWith("#")) h = h.substr(1);
            var c = new Array(4);
            c[3] = 'FF';
            switch (h.length) {
                case 3:
                case 4:
                    h.split('').forEach((x, i) => c[i] = x + x);
                    break;
                case 6:
                case 8:
                    h.match(/.{2}/g).forEach((x, i) => c[i] = x);
                    break;
                default:
                    throw `cannot convert "${h}" to color`;
            }
            c = c.map(x => parseInt(x, 16) / 255);
            return this.rgba(c[0], c[1], c[2], c[3]);
        },
        of (spec) { return Object.assign(new color(), spec) },
    });

    Object.assign(color.prototype, color);
    Object.assign(color.prototype, {
        clamp () {
            var r = fn.clamp(this.r, 0, 1);
            var g = fn.clamp(this.g, 0, 1);
            var b = fn.clamp(this.b, 0, 1);
            var a = fn.clamp(this.a, 0, 1);
            return color.rgba(r, g, b, a);
        },
        format () {
            var c = this.clamp();
            var r = parseInt(c.r * 255);
            var g = parseInt(c.g * 255);
            var b = parseInt(c.b * 255);
            var a = c.a;
            return `rgba(${r}, ${g}, ${b}, ${a})`
        },
        of (spec) { return Object.assign(new color(), this, spec) },
        alpha (a) { return this.of({ a: this.a * a }) },
        scale (x) { return color.rgba(this.r*x, this.g*x, this.b*x, this.a*x) },
        add (c) { return color.rgba(this.r+c.r, this.g+c.g, this.b+c.b, this.a+c.a) },
        mix (c, amount) { return c.scale(amount).add(this.scale(1-amount)) },
        brighten (amount) { return this.mix(this.rgba(1,1,1,this.a), amount) },
    });

    return color;
});

