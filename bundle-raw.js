
// functional programming utilities (including some math utilities)

define('fn',{
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




define('color',['fn'], fn => {
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
        parse_rgba (c) {
            var shards = c.substr(5, c.length-5-1).split(/,\s*/);
            if (shards.length != 4) throw `cannot parse rgba "${c}"`;
            return this.rgba(shards[0]/255, shards[1]/255, shards[2]/255, parseFloat(shards[3]));
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
        mix (c, amount) {
            if (amount === 0) return this;
            if (amount === 1) return c;
            return c.scale(amount).add(this.scale(1-amount));
        },
        brighten (amount) { return this.mix(this.rgba(1,1,1,this.a), amount) },
    });

    return color;
});




define('fokree',['fn', 'color'], (fn, clr) => {
    // canvas
    //      :: canvas-element
    //      -> ((number `xbound`, number `ybound`) -> ()) `update`
    //      -> (canvas-context-2d -> (() -> ()) `next` -> ()) `draw`
    //      -> number? `ups`
    //      -> ()
    var canvas = (element, update, draw, ups) => {  // ups: update per second
        // sanitize arguments
        if (ups == null) ups = 30;

        // initialize canvas
        var ctx = element.getContext('2d');
        var mspu = parseInt(1000 / ups);

        var start_time;
        var last_time;
        requestAnimationFrame(ms => {
            start_time = ms;
            last_time = start_time - mspu;
        });

        var setup = () => {
            var w = element.width;
            var h = element.height;

            // setup coordinate system
            // - bound: [-xbound, xbound] × [-ybound, ybound]
            //          assert(xbound === 1 || ybound === 1)
            // - safe-bound: [-1, 1] × [-1, 1]
            // - origin: (0, 0) center of canvas
            // - x-axis: west -1, east 1
            // - y-axis: south -1, north 1
            var xbound = (w < h ? 1 : w / h);
            var ybound = (w < h ? h / w : 1);
            ctx.setTransform(w/2 / xbound,    0         ,       // x-axis
                               0         , -h/2 / ybound,       // y-axis
                             w/2         ,  h/2         );      // origin
            return { x: xbound, y: ybound };
        };
        var bound = setup();

        // render loop
        var rendering = false;
        var next = () => {
            if (rendering) return;
            rendering = true;
            requestAnimationFrame(render);
        }
        var render = ms => {
            rendering = false;

            // update
            if (ms - last_time >= mspu) {
                update(ms-start_time, bound.x, bound.y);
                last_time = ms;
            }

            // draw
            ctx.save();
            draw(ctx, next);
            ctx.restore();
        };

        // bootstrap
        next();

        var resize = () => (bound = setup(), next());
        return resize;
    };


    var draw = (() => {
        var ctx;        // populated later
        var rotation;   // populated later
        var dom_cache = {};

        // apply_rotation :: { x, y } `p` -> { angle, scale } `rot` -> ()
        // this function is for side-effect.
        // apply rotation (including rotation and scaling) to position.
        var apply_rotation = (p, rot) => {
            var c = Math.cos(rot.angle);
            var s = Math.sin(rot.angle);
            var x = p.y*s + p.x*c;
            var y = p.y*c - p.x*s;
            p.x = x * rot.scale;
            p.y = y * rot.scale;
        };

        var draws = {
            clear (dcall) {
                ctx.fillStyle = dcall.color;
                ctx.fillRect(-dcall.xbound, -dcall.ybound, dcall.xbound*2, dcall.ybound*2);
            },

            rotate (dcall) {
                rotation = dcall.rotation
                ctx.rotate(dcall.rotation.angle);
                ctx.scale(dcall.rotation.scale, dcall.rotation.scale);
            },

            line (dcall) {
                var line = fn.initiator(
                        p => ctx.moveTo(p.x, p.y),
                        p => ctx.lineTo(p.x, p.y));
                ctx.beginPath();
                dcall.data.forEach(p => line(p));

                ctx.strokeStyle = dcall.color;
                ctx.lineWidth   = dcall.width;
                ctx.stroke();
            },

            polygon (dcall) {
                var line = fn.initiator(
                        p => ctx.moveTo(p.x, p.y),
                        p => ctx.lineTo(p.x, p.y));
                ctx.beginPath();
                dcall.data.forEach(p => line(p));
                ctx.closePath();

                ctx.fillStyle = dcall.color;
                ctx.fill();
            },

            dots (dcall) {
                ctx.fillStyle = dcall.color;
                ctx.strokeStyle = dcall.color;
                ctx.lineWidth = dcall.radius*2;
                dcall.data.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, dcall.radius, 0, 2*Math.PI);
                    ctx.closePath();
                    ctx.fill();
                });
            },

            dust (dcall) {
                var x = dcall.data.x;
                var y = dcall.data.y;
                var r = dcall.radius;
                var color = clr.parse_rgba(dcall.color);
                var g = ctx.createRadialGradient(x, y, 0, x, y, r);
                for (var i=1; i<=10; i++) {
                    var ui = fn.unlerp(i, 1, 10);
                    g.addColorStop(ui, color.alpha((1-ui)*(1-ui)).format());    // quadratic falloff
                }

                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2*Math.PI);
                ctx.fillStyle = g;
                ctx.fill();
            },

            lines (dcall) {
                ctx.strokeStyle = dcall.color;
                ctx.lineWidth = dcall.width;
                dcall.data.forEach(p => {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + dcall.dir.x, p.y + dcall.dir.y);
                    ctx.stroke();
                });
            },

            dom (dcall) {   // dcall in viewport coordinate
                if (fn.same(dom_cache[dcall.element.id], dcall)) return;
                dom_cache[dcall.element.id] = dcall;

                var pstyle = dcall.element.parentElement.style;
                pstyle.opacity = dcall.a;
                if (dcall.a === 0) {
                    pstyle.visibility = 'hidden';
                    return;
                }
                pstyle.visibility = 'visible';

                var style = dcall.element.style;
                style.color = dcall.color;
                apply_rotation(dcall, rotation);    // manually do the rotation and scaling
                style.transform = `translate(${dcall.x}vmin, ${dcall.y}vmin) rotate(${-rotation.angle}rad) scale(${rotation.scale})`;
                if (dcall.blur == null)
                    pstyle['filter'] = pstyle['-webkit-filter'] = "";
                else {
                    var blur = Math.min(dcall.blur, 15);
                    pstyle['filter'] = pstyle['-webkit-filter'] = `blur(${blur}px)`;
                }

                for (var i in dcall.size) {
                    var s = dcall.size[i];
                    style[s.name] = `${s.value}vmin`;
                }
            },

            safe_frame (dcall) {
                ctx.restore();
                ctx.save();
                // big 16:9 frame
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 0.005;
                ctx.strokeRect(-16/9+0.01, -1+0.01, 16/9*2-0.02, 2-0.02);
                // 0.9 big 16:9 frame
                ctx.strokeStyle = "#F00";
                ctx.lineWidth = 0.01;
                ctx.strokeRect(-16/9*0.9+0.01, -0.9+0.01, 16/9*2*0.9-0.02, 1.8-0.02);
                // square frame
                ctx.strokeStyle = "#F00";
                ctx.lineWidth = 0.005;
                ctx.strokeRect(-1+0.01, -1+0.01, 2-0.02, 2-0.02);
                // 0.9 square frame
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 0.005;
                ctx.strokeRect(-0.9+0.01, -0.9+0.01, 1.8-0.02, 1.8-0.02);
                // 16:9 frame
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 0.005;
                ctx.strokeRect(-1+0.01, -9/16+0.01, 2-0.02, 9/16*2-0.02);
                // 0.9 16:9 frame
                ctx.strokeStyle = "#F00";
                ctx.lineWidth = 0.01;
                ctx.strokeRect(-0.9+0.01, -9/16*0.9+0.01, 1.8-0.02, 9/16*2*0.9-0.02);
                // tri-guides
                ctx.strokeStyle = "#338";
                ctx.lineWidth = 0.005;
                ctx.strokeRect(-dcall.xbound, -dcall.ybound/3, 2*dcall.xbound, dcall.ybound/3*2);
                ctx.strokeRect(-dcall.xbound/3, -dcall.ybound, dcall.xbound/3*2, 2*dcall.ybound);
                // tri-guides in big 16:9
                ctx.strokeStyle = "#66F";
                ctx.lineWidth = 0.01;
                ctx.strokeRect(-16/9, -1/3, 2*16/9, 1/3*2);
                ctx.strokeRect(-16/9/3, -1, 16/9/3*2, 2*1);
                ctx.restore();
                ctx.save();
            },
        };

        return (ctx_, dcall) => {
            ctx = ctx_;
            draws[dcall.name](dcall);
        };
    })();

    return { canvas, draw };
});




define('random',[],() => {
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



// camera lens

define('lens',['fn'], (fn) => {
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




define('cliff',['random', 'fn'], (rand, fn) => {
    var spread;
    var max_height;
    var detail = 10;

    var cache_selector = {};
    var select_cache = (...args) => {
        var a = JSON.stringify(args);
        if (cache_selector[a] == null) cache_selector[a] = { rough: {}, detail: {} };
        return cache_selector[a];
    }

    var cache;
    var height = (i) => fn.relerp(rand(i*1995 + 134), -1, 1, 0, max_height);
    var flatten = (y, threshold, pressure) =>
            y < threshold ? y * (1-pressure)
                          : (y - threshold) * (1-pressure) + pressure + threshold;
    var height2 = (i, threshold, pressure) => flatten(height(i), threshold, pressure);
    var generate = (i) => {
        if (cache[i] == null) {
            var threshold = max_height * 0.4;
            var pressure = 0.4;
            var y = height2(i, threshold, pressure);
            var y0 = height2(i-1, threshold, pressure);
            var y1 = height2(i+1, threshold, pressure);
            if (y > threshold && y0 < threshold && y1 < threshold)
                y = (y + y0*3 + y1*3) / 7;
            var x = i * spread + rand(i)*spread*0.3;
            cache[i] = { x, y };
        }
        return cache[i];
    };

    var detail_cache;
    var generate_detail = (i) => {
        if (detail_cache[i] == null) {
            var threshold = max_height * 0.4;
            var pressure = 0.4;
            var di = Math.floor(i / detail);
            var p0 = generate(di);
            var p1 = generate(di+1);
            var x = fn.relerp(i/detail-di, 0, 1, p0.x, p1.x);
            var y = fn.relerp(i/detail-di, 0, 1, p0.y, p1.y);
            if (Math.abs(p0.y-p1.y) > threshold) {
                var tension = fn.relerp(rand(di*1997+9876), -1, 1, 0, (p0.y < p1.y ? 1 : -1) / spread / 2);
                var t = fn.relerp(y, 0, max_height, 1, -0.8);
                t = 1 - (1-t) * (1-t);
                x += rand(y*1996+321) * 0.1 + t*tension * 0.4;
            }
            detail_cache[i] = { x, y };
        }
        return detail_cache[i];
    };

    return (front, back, height, spread_) => {
        max_height = (height == null ? 1.7 : height);
        spread = (spread_ == null ? 0.5 : spread_);
        var c = select_cache(max_height, spread);
        cache = c.rough;
        detail_cache = c.detail;

        front = Math.floor(front/spread) - 2;
        back  = Math.ceil ( back/spread) + 2;
        front *= detail;
        back  *= detail;

        var result = [];
        var width = back-front;
        if (width > 20000) {    // LOD
            result.push(generate_detail(front));
            result.push(generate_detail(back));
            return result;
        }

        var skip = 1;
        if (width > 500) {      // LOD
            skip = Math.floor(width / 500);
            skip = parseInt(skip);
            front = parseInt(front / skip) * skip;
        }
        for (var i=front; i<=back; i+=skip)
            result.push(generate_detail(i));
        return result;
    };
});




define('mountain',['random', 'fn'], (rand, fn) => {
    var spread;
    var max_height;

    var cache_selector = {};
    var select_cache = (...args) => {
        var a = JSON.stringify(args);
        if (cache_selector[a] == null) cache_selector[a] = {};
        return cache_selector[a];
    }

    var cache;
    var height = (i) => fn.relerp(rand(i*1995 + 134), -1, 1, 0, max_height);
    var generate = (i) => {
        if (cache[i] == null) {
            var y = height(i);
            var x = i * spread + rand(i)*spread*0.3;
            cache[i] = { x, y };
        }
        return cache[i];
    };

    return (front, back, height, spread_) => {
        spread = (spread_ == null ? 0.5 : spread_);
        max_height = (height == null ? 2 : height);
        cache = select_cache(spread, max_height);

        front = parseInt(front/spread) - 2;
        back  = parseInt( back/spread) + 2;

        var result = [];
        var width = back-front;
        if (width > 2000) { // LOD
            result.push(generate(front));
            result.push(generate(back));
            return result;
        }

        var skip = 1;
        if (width > 200) {      // LOD
            skip = Math.floor(width / 200);
            skip = parseInt(skip);
            front = parseInt(front / skip) * skip;
        }
        for (var i=front; i<=back; i+=skip)
            result.push(generate(i));
        return result;
    };
});




// T? => T | ()
// anim T => time -> T?
// spec => { name: (anim value | value) }
// actor => anim { name: anim }
// sampler T => time -> T?

define('fap',['random', 'fn'], (rand, fn) => {
    // anim :: sampler T -> anim T
    var anim = (() => {
        function anim(sampler)
        {
            if (sampler == null) sampler = t => null;
            this.sample = sampler;
        }

        var _ = anim.prototype;

        // basic op
        _.mapt = function(f) {
            return new anim((sample =>
                t => sample(f(t))
            )(this.sample));
        };

        _.filtert = function(f, otherwise) {
            if (otherwise === undefined) otherwise = null;
            return new anim((sample =>
                t => f(t) ? sample(t) : otherwise
            )(this.sample));
        };

        _.map = function(f) {
            return new anim((sample =>
                t => f(sample(t))
            )(this.sample));
        };

        _.then = function(after, a) {
            return new anim((
                sample => t => t < after ? sample(t) : a.sample(t - after)
            )(this.sample));
        };

        // `this` should have no side effect, or `resample` becomes `throttle`
        _.resample = function(duration) {
            var last_frame;
            var last_sample;
            return new anim((
                sample => t => (
                    frame => last_frame === frame
                        ? last_sample
                        : (last_frame = frame,
                           last_sample = sample(frame*duration))
                    )(Math.floor(t / duration))
                )(this.sample));
        };

        // `this` must have no side effect
        _.smooth = function(dura) {
            if (dura == null) dura = 1;
            var s = this.shift(dura).resample(dura);
            var e = this.resample(dura);
            return new anim(t => (
                (a, b) => a === b
                    ? a
                    : fn.lerp(fn.smoothstep(fn.mod(t, dura) / dura), a, b)
            )(s.sample(t), e.sample(t)));
        };

        // `this` must have no side effect
        _.linear = function(dura) {
            if (dura == null) dura = 1;
            var s = this.shift(dura).resample(dura);
            var e = this.resample(dura);
            return new anim(t => (
                (a, b) => a === b
                    ? a
                    : fn.lerp(fn.mod(t, dura) / dura, a, b)
            )(s.sample(t), e.sample(t)));
        };



        // sugars
        _.shift = function(offset) {
            if (offset === 0) return this;
            return this.mapt(t => t - offset);
        };

        _.stretch = function(scale) {
            if (scale === 1) return this;
            return this.mapt(t => t / scale);
        };

        _.repeat = function(duration) {
            return this.mapt(t => fn.mod(t, duration));
        };


        _.cut = function(l, r, otherwise) {
            return this.filtert(t => l <= t && t <= r, otherwise);
        };

        _.cutl = function(at, otherwise) {
            return this.filtert(t => t >= at, otherwise);
        };

        _.cutr = function(at, otherwise) {
            return this.filtert(t => t <= at, otherwise);
        };

        // side effects
        _.edge = function(last) {
            return new anim((sample =>
                t => (s =>
                    s === last ? null : last = s
                )(sample(t))
            )(this.sample));
        };

        // `edge` base on deep comparison
        _.dedge = function(last) {
            return new anim((sample =>
                t => (s =>
                    fn.same(s, last) ? null : last = s
                )(sample(t))
            )(this.sample));
        };

        _.select = function(...selections) {
            return new anim((sample =>
                t => (s =>
                    s == null ? null : selections[s].sample(t)
                )(sample(t))
            )(this.sample));
        };


        // maker
        var make = (...args) => new anim(...args);
        make.is = x => x instanceof anim;

        return make;
    })();

    // { *: value | [this] } >>> { *: anim value | [this] }
    var sanitize_spec = spec => {
        for (var name in spec) {
            if (spec[name] instanceof Array) {
                var s = spec[name];
                s.forEach((a, i) => {
                    if (!anim.is(a)) s[i] = anim(t => a)
                });
                continue;
            }

            if (!anim.is(spec[name])) {
                spec[name] = anim((x => t => x)(spec[name]));
                continue;
            }
        }
    };

    // actor :: name -> spec -> actor
    var actor = (name, spec) => {
        if (name == null) return anim();
        if (spec == null) spec = {};
        spec.name = name;
        sanitize_spec(spec);

        var sample = (spec, t) => {
            var result = {};
            for (var name in spec) {
                var value = spec[name];
                var sp = (value instanceof Array
                         ? value.map(a => a.sample(t)).filter(x => x != null)
                         : value.sample(t));
                if (sp == null) return null;
                result[name] = sp;
            }
            return result;
        };

        return anim(t => sample(spec, t));
    };

    // a side-effect anim, whose result is dependent on the value set by calling `set`
    var state = (initial) => {
        if (initial === undefined) initial = null;
        var a = anim(t => initial);
        a.set = x => initial = x;
        return a;
    };

    // extra anim makers
    var identity = x => anim(t => x);
    var ease = (y0, x, y) => anim(t => (y-y0)/x * t + y0);
    var tween = (() => {
        var tweeners = {
            hold  : k => 0,
            linear: k => k,
            smooth: k => fn.smoothstep(k),
        };

        // spec => { tween: ('hold' | 'smooth' | 'linear'), data: [ [time, value] ] }
        return spec => {
            // sanitize arguments
            var data = spec.data;
            if (data == null || data.length === 0) return identity(null);
            data.sort((a, b) => a[0] - b[0]);   // sort by time

            var srate = spec.sample_rate;
            if (srate == null) srate = 10;

            var tween = tweeners[spec.tween];
            if (spec.tween == null) tween = tweeners.smooth;
            if (tween == null) throw `unknown tweening method: ${spec.tween}`;

            // tweening at sample rate `srate`
            var start_frame = Math.floor(data[            0][0] * srate);
            var   end_frame = Math.ceil (data[data.length-1][0] * srate);

            //:: shift by 1/srate is enough, 2 is used for float inaccuracy prevention.
            data.unshift([data[            0][0] - 2 / srate, data[0][1]]);
            data.push   ([data[data.length-1][0] + 2 / srate, data[0][1]]);

            var idata = 0;
            var samples = [];
            for (var iframe=start_frame; iframe<=end_frame; iframe++) {
                var time = iframe / srate;
                while (time >= data[idata+1][0]) idata++;

                var data0 = data[idata  ];
                var data1 = data[idata+1];

                var k = tween(fn.unlerp(time, data0[0], data1[0]));
                var value = fn.lerp(k, data0[1], data1[1]);
                samples[iframe-start_frame] = value;
            }

            var sample = i => i < 0 ? samples[0] :
                i < samples.length ? samples[i] :
                samples[samples.length-1];

            return anim(t => (
                frame => (
                    (i, k) => fn.lerp(k, sample(i), sample(i+1))
                )(Math.floor(frame), fn.mod(frame, 1))
            )(t * srate - start_frame));
        };
    })();

    // built-in anims
    var random = anim(t => rand(t)).resample(1);
    var wiggle = random.smooth();

    // extra operators
    var zip = (f, ...as) => anim(t => f(...as.map(a => a.sample(t))));

    return {
        anim, actor, state,
        identity, ease, tween,
        random, wiggle,
        zip,
    };
});




define('firefly',['random', 'fap', 'color', 'fn'], (rand, fap, clr, fn) => {
    var depth = 20;     // camera fog distance
    var at;
    var lens;
    var color = fap.state();
    var working = fap.state();

    var firefly = (offset) => {
        var njump = 2*parseInt(fn.relerp(rand(offset), -1, 1, 1, 4));

        var not_in_cam = x => Math.abs(x) < 0.7 ? 2 : x;
        var oz = fap.anim(t => not_in_cam(rand(t*1997) * depth) - at.z).resample(njump);
        var dz = fap.wiggle.shift(-199.6).stretch(1.3).map(x => x*0.05);
        var z = fap.anim(t => oz.sample(t) + dz.sample(t) + at.z);
        var to_world = fap.anim(t => lens.screen_to_world(z.sample(t))).resample(njump);

        var ox = fap.anim(t => rand(t) * lens.xbound * to_world.sample(t) - at.x).resample(njump);
        var dx = fap.wiggle.shift(1993.7).stretch(1.2).map(x => x*0.1);
        var x = fap.anim(t => ox.sample(t) + dx.sample(t) + at.x);

        var oy = fap.anim(t => fn.relerp(rand(t*1995), -1, 1, -1, 4)).resample(njump);
        var dy = fap.wiggle.stretch(1.2).map(x => x*0.1);
        var y = fap.anim(t => oy.sample(t) + dy.sample(t) + at.y);

        var blink = fap.wiggle.map(x => fn.relerp(x, -1, 1, 0.6, 1)).stretch(0.13).shift(rand(offset*123));
        var a  = fap.anim(t => blink.sample(t) * Math.min(1, Math.cos(fn.relerp(t, 1, 3, 0, 2*Math.PI)) + 1));
        var r  = 0.04;
        return fap.actor('firefly', {
            x, y, z, a,
            color,
            radius: r,
            _trigger: working.resample(njump),
        }).shift(offset);
    };

    var fireflys = [];
    var n = 600;
    while (n--) fireflys.push(firefly(rand(n*476)*1935427));

    return (x, y, z, lens_, color_, working_) => {
        at = { x, y, z };
        lens = lens_;
        color.set(color_);
        working.set(working_ || null);
        return fireflys;
    };
});




define('rain',['random', 'fap', 'color', 'fn'], (rand, fap, clr, fn) => {
    var depth = 20;     // camera fog distance
    var at;
    var lens;
    var color = fap.state();
    var working = fap.state();

    var rain = (offset) => {
        var oz = fap.anim(t => rand(t*1997) * depth - at.z).resample(1);
        var z  = fap.anim(t => oz.sample(t) + at.z);
        var to_world = fap.anim(t => lens.screen_to_world(z.sample(t))).resample(1);

        var angle = fap.random.stretch(1997).map(x => fn.relerp(x, -1, 1, fn.radians(70), fn.radians(80)));
        var fall  = fap.random.stretch(9937).map(x => fn.relerp(x, -1, 1, 9, 15));
        var length= fap.random.stretch(3791).map(x => fn.relerp(x, -1, 1, 2, 5));

        var ox = fap.anim(t => rand(t) * lens.xbound * to_world.sample(t) - at.x).resample(1);
        var dx = fap.anim(t => -fall.sample(t)*Math.cos(angle.sample(t)) * fn.mod(t, 1));
        var x  = fap.anim(t => ox.sample(t) + dx.sample(t) + at.x);

        var oy = fap.anim(t => fn.relerp(rand(t*1995), -1, 1, 2, 10)).resample(1);
        var dy = fap.anim(t => -fall.sample(t)*Math.sin(angle.sample(t)) * fn.mod(t, 1));
        var y  = fap.anim(t => oy.sample(t) + dy.sample(t) + at.y);

        var a  = fap.ease(0, 0.1, 0.4)
                    .then(0.1, fap.ease(0.4, 0.4, 0.1))
                    .then(0.5, fap.ease(0.1, 0.5, 0))
                    .repeat(1)
                    .map(x => x*0.8);
        var w  = 0.04;
        return fap.actor('rain', {
            x, y, z, a, angle, length,
            color,
            width: w,
            _trigger: working.resample(1),
        }).shift(offset).stretch(0.5);
    };

    var rains = [];
    var n = 600;
    while (n--) rains.push(rain(rand(n*476)*1935427));

    return (x, y, z, lens_, color_, working_) => {
        at = { x, y, z };
        lens = lens_;
        color.set(color_);
        working.set(working_ || null);
        return rains;
    };
});




define('bokeh',['random', 'fap', 'color'], (rand, fap, clr) => {
    var lens;
    var working = fap.state();

    var bokeh = (offset) => {
        var x = fap.anim(t => rand(t) * lens.xbound).resample(2);

        var lower = x => (x + 1) * (x + 1) / 2 - 1;
        var oy = fap.anim(t => lower(rand(t*1995)) * lens.ybound).resample(2);
        var dy = fap.identity(0)
                .then(0.3, fap.ease(0, 1.7, -0.05))
                .repeat(2);
        var y = fap.anim(t => oy.sample(t) + dy.sample(t));

        var a  = fap.ease(0, 0.1, 0.5)
                .then(0.1, fap.ease(0.5, 0.2, 0.4))
                .then(0.3, fap.ease(0.4, 1.7, 0))
                .repeat(2);
        var r  = fap.identity(0.07)
                .then(0.3, fap.ease(0.07, 1.7, 0.06))
                .repeat(2);

        return fap.actor('bokeh', {
            x, y, a,
            z: 0,
            color: clr.rgb(0,0,0),  // unused
            radius: r,
            _trigger: working.resample(2),
        }).shift(offset);
    };

    var n = 20;
    var bokehs = [];
    while (n--) bokehs.push(bokeh(rand(n*476)*1935427));

    return (lens_, working_) => {
        lens = lens_;
        working.set(working_ || null);
        return bokehs;
    };
});


'use strict'

define('landscape',['random', 'fn', 'color'], (rand, fn, clr) => {
    var nlayer = 5;
    var depth = 20;     // camera fog distance

    var candidates = [
        {
            make: (i, x, y, z, color) => ({
                name: 'mountain',
                x,
                y: y + fn.relerp(rand(i*147), -1, 1, 0, -1),
                z,
                color,
                spread: 0.7 + fn.relerp(parseInt(rand(i*147)*3), -3, 3, -0.5, 1.5),
                height: 2.5 + fn.relerp(parseInt(rand(i*147)*3), -3, 3, -1, 5),
            }),
        },
        {
            make: (i, x, y, z, color) => ({
                name: 'cliff',
                x,
                y: y+fn.relerp(rand(i*627), -1, 1, 0, -2),
                z,
                color,
                spread: 0.7 + fn.relerp(parseInt(rand(i*627)*3), -3, 3, -0.5, 0),
                height: 2 + fn.relerp(parseInt(rand(i*627)*3), -3, 3, -1, 2),
            }),
        },
    ];

    var pick = i => {
        var c = parseInt(fn.relerp(rand(i*222+147), -1, 1, 0, candidates.length))
        return candidates[c];
    };

    return (x, y, z, color) => {
        var front = fn.relerp(-z, 0, depth, 0, nlayer);
        var front_layer = Math.ceil(front);
        var layers = [];
        for (var i=0; i<nlayer+2; i++) {
            var ilayer = fn.relerp(i, 0, nlayer+1, front_layer, front_layer - nlayer - 1);
            var ox = x + rand(ilayer*173) * 1996;
            var oy = y + rand(ilayer*731);
            var oz = z + fn.relerp(ilayer, 0, nlayer, 0, depth) + rand(ilayer*1997+3)*0.4;
            layers.push(pick(ilayer).make(ilayer, ox, oy, oz, color));
        }
        return layers;
    };
});




define('scenegraph',[
    'color', 'random', 'fn', 'lens',
    'cliff', 'mountain', 'firefly', 'rain', 'bokeh',
    'landscape',
], (clr, rand, fn, make_lens, cliff, mt, make_firefly, make_rain, make_bokeh, make_landscape) => {
    return () => {
        //---- apply
        // return rendercalls, lens, rot and color
        var apply = (() => {
            var appliers = {
                landscape (node) {
                    return make_landscape(node.x, node.y, node.z, node.color);
                },
                firefly (node, time, lens) {
                    return make_firefly(node.x, node.y, node.z, lens, node.color, node.working)
                            .map(x => x.sample(time));
                },
                rain (node, time, lens) {
                    return make_rain(node.x, node.y, node.z, lens, node.color, node.working)
                            .map(x => x.sample(time));
                },
                bokeh (node, time, lens) {
                    var rcall = make_bokeh(lens, node.working).map(x => x.sample(time));
                    rcall.clipfree = true;
                    return rcall;
                },
                dom (node, time) {
                    node.clipfree = true;
                    return node;
                },
                cluster (node, time) {
                    node.setup(node.x, node.y, node.z);
                    return node.data.map(x => x.sample(time));
                },
            };

            return (scene, xbound, ybound) => {
                var lens = make_lens(scene.fov, xbound, ybound, scene.fog_color);
                var rot  = lens.rotate(scene.rot);

                // sanitize nodes
                var defaults = {
                    x: 0,
                    y: 0,
                    z: 0,
                    color: clr.rgb(0,0,0),
                };
                var rcalls = scene.data.map(node => Object.assign({}, defaults, node));

                // apply color masking
                if (scene.mask.a)
                    rcalls.forEach(node => {
                        node.color = node.color.mix(
                            scene.mask.of({ a: 1 }),
                            scene.mask.a);
                    });

                // apply camera position
                rcalls.forEach(node => {
                    node.x -= scene.x;
                    node.y -= scene.y;
                    node.z -= scene.z;
                });

                // generate rendercalls
                rcalls = fn.flatmap(rcalls,
                                    node => appliers[node.name](node, scene.time, lens))
                            .filter(x => x != null);

                return { rcalls, lens, rot, sky_color: scene.sky_color };
            };
        })();


        //---- render
        var render = (() => {
            var lens;   // populated later

            // convert rendercalls to rendercalls, or,
            // convert rendercalls to   drawcalls
            var phase = (renderers, calls) =>
                fn.flatmap(calls, call => renderers[call.name](call));

            var renderers = {};

            renderers.hl = {
                cliff (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var wxbound = lens.xbound * to_world;   // world x bound
                    var wybound = lens.ybound * to_world;   // world y bound
                    var data = cliff(-rcall.x-wxbound, -rcall.x+wxbound, rcall.height, rcall.spread)
                                .map(p => ({
                                    x: p.x + rcall.x,
                                    y: p.y + rcall.y,
                                }));
                    data.unshift({ x: -wxbound, y: -wybound });
                    data.push   ({ x:  wxbound, y: -wybound });
                    return {
                        name: 'polygon',
                        data,
                        z: rcall.z,
                        color: rcall.color,
                    };
                },

                mountain (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var wxbound = lens.xbound * to_world;   // world x bound
                    var wybound = lens.ybound * to_world;   // world y bound
                    var data = mt(-rcall.x-wxbound, -rcall.x+wxbound, rcall.height, rcall.spread)
                                .map(p => ({
                                    x: p.x + rcall.x,
                                    y: p.y + rcall.y,
                                }));
                    data.unshift({ x: -wxbound, y: -wybound });
                    data.push   ({ x:  wxbound, y: -wybound });
                    return {
                        name: 'polygon',
                        data,
                        z: rcall.z,
                        color: rcall.color,
                    };
                },

                bokeh (rcall) {
                    var to_world = lens.screen_to_world(-1);
                    return {
                        name: 'dots',
                        data: [{ x: rcall.x * to_world, y: rcall.y * to_world }],
                        color: clr.rgba(1,1,1,rcall.a),
                        radius: rcall.radius * to_world,
                        z: -1,
                    };
                },

                firefly (rcall) {
                    return {
                        name: 'dots',
                        data: [{ x: rcall.x, y: rcall.y }],
                        color: rcall.color.alpha(rcall.a),
                        radius: rcall.radius,
                        z: rcall.z,
                    };
                },

                dust (rcall) {
                    return {
                        name: 'dust',
                        data: { x: rcall.x, y: rcall.y },
                        color: rcall.color.alpha(rcall.a),
                        radius: rcall.radius,
                        z: rcall.z,
                    };
                },

                rain (rcall) {
                    return {
                        name: 'lines',
                        data: [{ x: rcall.x, y: rcall.y }],
                        color: rcall.color.alpha(rcall.a),
                        width: rcall.width,
                        angle: rcall.angle,
                        length: rcall.length,
                        z: rcall.z,
                    };
                },

                dom (rcall) {
                    return rcall;
                },
            };

            renderers.ll = {
                polygon (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => fn.vmap(world, x => x * to_screen));
                    var dcalls = [];
                    var field = lens.field(rcall.z);
                    dcalls.push({
                        name: 'polygon',
                        data,
                        color: rcall.color,
                    });
                    if (field.blur)
                        dcalls.push({
                            name: 'line',
                            data,
                            color: rcall.color.alpha(field.blur_alpha),
                            width: field.blur * to_screen,
                        });
                    return dcalls;
                },

                dots (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => fn.vmap(world, x => x * to_screen));
                    var field = lens.field(rcall.z);
                    var dcall = {
                        name: 'dots',
                        data,
                        color: rcall.color,
                        radius: rcall.radius * to_screen,
                    };
                    if (field.blur) {
                        dcall.radius += field.blur * 0.05 * to_screen;
                        var a = (field.blur < 0.9
                            ? fn.relerp(field.blur, 0, 0.9, 1, 0.8)
                            : fn.relerp(field.blur, 0.9, 1, 0.8, 0));
                        dcall.color = dcall.color.brighten(
                                fn.lerp(field.blur_alpha, 0.8, 0))
                            .alpha(a);
                    }
                    return dcall;
                },

                dust (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = fn.vmap(rcall.data, x => x * to_screen);
                    var field = lens.field(rcall.z);
                    var dcall = {
                        name: 'dust',
                        data,
                        color: rcall.color,
                        radius: rcall.radius * to_screen,
                    };
                    if (field.blur) {
                        dcall.radius += field.blur * 0.05 * to_screen;
                        var a = (field.blur < 0.9
                            ? fn.relerp(field.blur, 0, 0.9, 1, 0.8)
                            : fn.relerp(field.blur, 0.9, 1, 0.8, 0));
                        dcall.color = dcall.color.brighten(
                                fn.lerp(field.blur_alpha, 0.8, 0))
                            .alpha(a);
                    }
                    return dcall;
                },

                lines (rcall) {
                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var data = rcall.data.map(world => fn.vmap(world, x => x * to_screen));
                    var field = lens.field(rcall.z);
                    var dir = {
                        x: Math.cos(rcall.angle) * rcall.length * to_screen,
                        y: Math.sin(rcall.angle) * rcall.length * to_screen,
                    };
                    var dcall = {
                        name: 'lines',
                        data,
                        color: rcall.color,
                        width: rcall.width * to_screen,
                        dir,
                    };
                    if (field.blur) {
                        dcall.width += field.blur * 0.2 * to_screen;
                        var a = (field.blur < 0.5
                            ? fn.relerp(field.blur, 0, 0.5, 1, 0.7)
                            : fn.relerp(field.blur, 0.5, 1, 0.7, 0));
                        dcall.color = dcall.color.alpha(a);
                    }
                    return dcall;
                },

                // will convert into viewport coordinate instead of screen coordinate
                dom (rcall) {
                    if (rcall.z >= 0)
                        return {
                            name: 'dom',
                            element: rcall.element,
                            a: 0,
                            color: rcall.color,
                        };

                    var to_world = lens.screen_to_world(rcall.z);
                    var to_screen = 1 / to_world;
                    var to_viewport = to_screen * 50;
                    var field = lens.field(rcall.z);
                    rcall.size.forEach(x => x.value *= to_viewport);
                    var dcall = {
                        name: 'dom',
                        element: rcall.element,
                        x:  rcall.x * to_viewport,
                        y: -rcall.y * to_viewport,
                        a: rcall.a,
                        color: rcall.color,
                        size: rcall.size,
                    };
                    if (field.blur) {
                        // dom blur is in `px` unit.
                        dcall.blur = field.blur * 0.1 * to_viewport;
                        var a = (field.blur < 0.6
                            ? fn.relerp(field.blur, 0, 0.6, 1, 0.8)
                            : fn.relerp(field.blur, 0.6, 1, 0.8, 0));
                        dcall.a *= a;
                        dcall.color = dcall.color.brighten(
                                fn.lerp(field.blur_alpha, 0.8, 0));
                    }
                    return dcall;
                },
            };

            var clip = rcall => {
                if (rcall.clipfree) return rcall;
                if (rcall.z > 0) return [];
                rcall.color = rcall.color.alpha(lens.field(rcall.z).alpha); // blind spot
                rcall.color = lens.fog(rcall.color, rcall.z);               // foggy
                return rcall;
            };

            return applied => {
                lens = applied.lens;

                var calls = applied.rcalls;
                calls.sort((a, b) => a.z - b.z);    // z-sorting
                calls = fn.flatmap(calls, clip);    // clipping and fading
                calls = phase(renderers.hl, calls); // render to low-level primitives
                calls = phase(renderers.ll, calls); // render to (almost) drawcalls
                calls.unshift({                     // add in "clear" call
                    name: 'clear',
                    color: applied.sky_color,
                    xbound: applied.lens.xbound,
                    ybound: applied.lens.ybound
                });
                calls.forEach(call => call.color = call.color.format());    // format colors to get proper drawcalls
                calls.unshift({ name: 'rotate', rotation: applied.rot });   // add in "rotate" call
                return calls;
            };
        })();

        // invoker
        return (scene, xbound, ybound) => render(apply(scene, xbound, ybound));
    };
});




define('cluster',['random', 'fap', 'color', 'fn'], (rand, fap, clr, fn) => {
    return (color, cx, cy, cz, radius, working) => {
        var at;
        var firefly = offset => {
            var njump = 2*parseInt(fn.relerp(rand(offset), -1, 1, 1, 4));

            var ox = fap.anim(t => rand(t) * radius).resample(njump);
            var dx = fap.wiggle.shift(1993.7).stretch(1.2).map(x => x*radius);
            var x = fap.anim(t => ox.sample(t) + dx.sample(t) + cx + at.x);

            var oy = fap.anim(t => rand(t*1995) * radius).resample(njump);
            var dy = fap.wiggle.stretch(1.2).map(x => x*radius);
            var y = fap.anim(t => oy.sample(t) + dy.sample(t) + cy + at.y);

            var oz = fap.anim(t => rand(t*1997) * radius).resample(njump);
            var dz = fap.wiggle.shift(-199.6).stretch(1.3).map(x => x*radius);
            var z = fap.anim(t => oz.sample(t) + dz.sample(t) + cz + at.z);

            var blink = fap.wiggle.map(x => fn.relerp(x, -1, 1, 0.6, 1)).stretch(0.13).shift(rand(offset*123));
            var a  = fap.anim(t => blink.sample(t) * Math.min(1, Math.cos(fn.relerp(t, 1, 3, 0, 2*Math.PI)) + 1));
            var r  = fap.ease(0.02, njump, 0.01).repeat(njump);
            return fap.actor('firefly', {
                x, y, z, a,
                color,
                radius: r,
                _trigger: working.resample(njump).shift(-offset),
            }).shift(offset);
        };

        var dust = offset => {
            var ox = fap.anim(t => rand(t) * 2*radius*0.5).resample(2);
            var dx = fap.wiggle.shift(1993.7).stretch(1.2).map(x => x*radius*0.5);
            var x = fap.anim(t => ox.sample(t) + dx.sample(t) + cx + at.x);

            var oy = fap.anim(t => rand(t*1995) * 2*radius*0.5).resample(2);
            var dy = fap.wiggle.stretch(1.2).map(x => x*radius*0.5);
            var y = fap.anim(t => oy.sample(t) + dy.sample(t) + cy + at.y);

            var oz = fap.anim(t => rand(t*1997) * 2*radius*0.5).resample(2);
            var dz = fap.wiggle.shift(-199.6).stretch(1.3).map(x => x*radius*0.5);
            var z = fap.anim(t => oz.sample(t) + dz.sample(t) + cz + at.z);

            var blink = fap.wiggle.map(x => fn.relerp(x, -1, 1, 0.6, 1)).stretch(0.13).shift(rand(offset*123));
            var a  = fap.anim(t => blink.sample(t) * Math.min(1, Math.cos(fn.relerp(t, 1, 3, 0, 2*Math.PI)) + 1));
            var r  = 3*radius*0.8;
            return fap.actor('dust', {
                x, y, z, a,
                color: color.alpha(0.3),
                radius: r,
                _trigger: working.resample(2).shift(-offset),
            }).shift(offset);
        };

        var setup = (x, y, z) => {
            at = { x, y, z };
        };

        var cluster = [];
        var n = 20;
        while (n--) cluster.push(firefly(rand(n*4716)*193427));
        n = 10;
        while (n--) cluster.push(dust(rand(n*716)*93427));

        return fap.identity({ name: 'cluster', data: cluster, setup });
    };
});




define('scene',['color', 'fn', 'fap', 'cluster'], (clr, fn, fap, make_cluster) => {
    return (states, keyframes, pages, clusters) => {
        // weather animation
        var raining = keyframes.raining;
        var lightning = fap.zip((raining, raining_edge, random) =>
                            raining && (raining_edge || random),
            raining,
            raining.edge(0).resample(1),
            fap.random.stretch(1/7184).map(x => x > 0.9 || x < -0.9).resample(1));

        var lightning_anim = fap.zip((a, b) => a*b,
                fap.wiggle.stretch(1 / 20).map(x => fn.relerp(x, -1, 1, 0.5, 1)),
                lightning.smooth(0.4));
        var raining_anim = raining.smooth(0.5);

        // prepare colors
        var colors = {};

        colors.sky = {
            normal: clr.hex('#0075A2'),
            raining: clr.hex('#001F58'),
            lightning: clr.hex('#BE3FFF'),
        };
        colors.fog = colors.sky;

        colors.landscape = {
            normal: clr.hex('#03202B'),
            raining: clr.hex('#01141B'),
        };
        colors.landscape.lightning = colors.landscape.raining;

        var changing_color = colors => fap.zip(
            (base, a) => base.mix(colors.lightning, a),
            raining_anim.map(a => colors.normal.mix(colors.raining, a)),
            lightning_anim);

        var sky_color = changing_color(colors.sky);
        var fog_color = changing_color(colors.fog);
        var landscape_color = changing_color(colors.landscape);
        var mask = lightning_anim.map(a => clr.rgba(0, 0, 0, a));

        // prepare page actors
        var page_actors = fn.flatmap(pages, page => [
            fap.actor('dom', {
                element: page.title.element,
                x: page.title.x,
                y: page.title.y,
                z: page.title.z,
                a: fap.identity(1).cut(page.show_time[0], page.show_time[1], 0).smooth(0.3),
                color: clr.hex(page.title.color),
                size: [
                    fap.actor('font-size', { value: page.title.size }),
                ],
            }),
            (page.content ? fap.actor('dom', {
                element: page.content.element,
                x: page.content.x,
                y: page.content.y,
                z: page.content.z,
                a: fap.identity(1).cut(page.show_time[0], page.show_time[1], 0).smooth(0.2),
                color: clr.hex(page.content.color),
                size: [
                    fap.actor('font-size', { value: page.content.size }),
                    fap.actor('width', { value: page.content.w }),
                    fap.actor('height', { value: page.content.h }),
                ],
            }) : null),
        ]).filter(x => x != null);

        var cluster_actors = clusters.map(c => make_cluster(
            c.color, c.x, c.y, c.z, c.radius,
            fap.identity(true).cut(c.show_time[0], c.show_time[1])));

        var double_control = name => {
            var state = states[name];
            var kf = keyframes[name];
            if (kf == null) return state;
            var e = state.edge(state.sample(0));
            var controlled = false;
            return fap.anim(t => {
                if (e.sample(t)) controlled = true;
                if (controlled) return state.sample(t);
                return kf.sample(t);
            });
        }

        // scene animation
        return fap.actor('scene', {
            time: keyframes.time,

            // camera
            x: double_control('x'),
            y: double_control('y'),
            z: double_control('z'),
            fov: double_control('fov'),
            rot: double_control('rot'),

            // color
            sky_color,
            fog_color,
            mask,

            // scene description
            data: [
                fap.actor('landscape', {
                    color: landscape_color,
                }),
                fap.actor('firefly', {
                    color: clr.hex('#85FF00').alpha(0.8),
                    working: raining.map(x => !x),
                }),
                fap.actor('rain', {
                    color: clr.rgba(1,1,1,0.8),
                    working: raining,
                }),
                fap.actor('bokeh', {
                    working: raining,
                }),
                ...page_actors,
                ...cluster_actors,
            ],
        });
    };
});




define('url',{
    // break url into { base, arg, anchor }
    //
    // base   will be kept as is (no decodeURI being done)
    // arg    will be kept as is (no decodeURI being done)
    // anchor will be decodeURI.
    //
    // - "base"                     -> { "base", undefined, undefined }
    // - "base?arg"                 -> { "base", "?arg", undefined }
    // - "base#anchor"              -> { "base", undefined, "#anchor" }
    // - "base?arg#anchor"          -> { "base", "?arg", "#anchor" }
    // - "base#anchor?still#anchor" -> { "base", undefined, "#anchor?still#anchor" }
    split (url) {
        var result = {};

        // anchor
        var anchor_at = url.indexOf("#");
        if (anchor_at !== -1) {
            result.anchor = decodeURI(url.substr(anchor_at));
            url = url.substr(0, anchor_at);
        }

        // arg
        var arg_at = url.indexOf("?");
        if (arg_at !== -1) {
            result.arg = url.substr(arg_at);
            url = url.substr(0, arg_at);
        }

        // base
        result.base = url;

        return result;
    },

    // break url arg part into object (key-value pair)
    // will decodeURIComponent
    // "?a=1%200&b=11" -> { a: "1 0", b: "11" }
    parse_arg (arg) {
        if (arg == null) return {};

        var args = {};
        arg.replace(/[?&]+([^=&]+)=([^&]*)/gi, (_, name, value) =>
                    args[decodeURIComponent(name)] = decodeURIComponent(value));
        return args;
    },

    build_arg (args) {
        var arg = [];
        for (var name in args)
            arg.push(encodeURIComponent(name) + "="
                + encodeURIComponent(args[name]));
        if (arg.length === 0) return "";
        return "?" + arg.join("&");
    },

    // parse url into base, arg, anchor args
    parse (url) {
        var result = this.split(url);
        result.args = this.parse_arg(result.arg);
        return result;
    },

    // build url from { base, arg, anchor }
    // { "http://example.com/", "?hi=10&yes=%2F", "#hello/" }
    //   -> "http://example.com/?hi=10&yes=%2F#hello%2F"
    // { "http://example.com/", { hi: 10, yes: "%2F" }, "#hello/" }
    //   -> "http://example.com/?hi=10&yes=%252F#hello%2F"
    build (base, arg, anchor) {
        if (arg == null) arg = "";
        if (typeof arg !== 'string') arg = this.build_arg(arg);

        if (anchor == null) anchor = "";
        anchor = encodeURI(anchor);

        return base + arg + anchor;
    },
});




define('ajax',['url'], (url) => ({
    json (post, base, args, ok, fail) {
        // normalize arguments
        if (  ok == null)   ok = () => {};
        if (fail == null) fail = () => {};

        // prepare callbacks
        var req = new XMLHttpRequest();
        req.onload = () => {
            var json = req.response;
            if (json == null) json = { error: "internal error" };
            if (json.error != null) fail(json.error);
            else ok(json);
        };
        req.onabort = () => fail("abort");
        req.onerror = () => fail("error");

        // fire!
        req.responseType = 'json';
        if (post) {
            req.open('POST', base);
            req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.send(url.build_arg(args).substr(1));    // arg always begins with '?' or empty string
        }
        else {
            req.open('GET', url.build(base, args));
            req.send();
        }
    },

     get_json (base, args, ok, fail) { this.json(false, base, args, ok, fail) },
    post_json (base, args, ok, fail) { this.json( true, base, args, ok, fail) },

    html (base, ok, fail) {
        // normalize arguments
        if (  ok == null)   ok = () => {};
        if (fail == null) fail = () => {};

        // prepare callbacks
        var req = new XMLHttpRequest();
        req.onload = () => {
            var html = req.response;
            if (html == null || req.status !== 200) fail("internal error");
            else ok(html);
        };
        req.onabort = () => fail("abort");
        req.onerror = () => fail("error");

        // fire!
        req.responseType = 'document';
        req.open('GET', base);
        req.send();
    },
}));




define('nav',['fn'], (fn) => {
    return (ul, pages, request_render) => {
        var next_target = null;
        var target = null;
        var active = null;
        var time = 0;
        var start_time;
        var   end_time;
        var start_frame_time;
        var   end_frame_time;
        var frame_time = 0;

        var go = page => {
            if (page === active && target == null) return;
            next_target = page;
            location.hash = `#${page.name}`;
            request_render();
        };

        var page_by_name = name => {
            var page = pages.find(page => page.name === name);
            if (page == null) {
                console.error(`no such page: ${name}`);
                return;
            }
            return page;
        };

        var frame = ms => {
            frame_time = ms;

            if (next_target != null) {
                var time_limit = 10;
                if (next_target === target) time_limit = 1;

                if (target != null) target.nav.classList.remove('target');
                target = next_target;
                next_target = null;
                target.nav.classList.add('target');

                start_time = time;
                  end_time = target.target_time;
                start_frame_time = frame_time;
                  end_frame_time = start_frame_time + Math.min(time_limit, Math.abs(end_time - start_time));
            }

            if (target != null) {
                var t = Math.min(1, fn.unlerp(frame_time, start_frame_time, end_frame_time));
                time = fn.lerp(fn.smoothstep(t), start_time, end_time);

                if (frame_time > end_frame_time) {  // reached
                    if (active != null) active.nav.classList.remove('active');

                    time = end_time;
                    active = target;
                    target = null;
                    active.nav.classList.remove('target');
                    active.nav.classList.add('active');

                    // fire once is enough
                    ul.classList.remove('hide');
                    localStorage.visited = "";
                }
                return time;
            }
            return null;
        };

        var make_nav_item = page => {
            var e = document.createElement('li');
            e.textContent = page.name.toUpperCase();
            page.nav = e;
            e.addEventListener('click', () => go(page));
            return e;
        };
        pages.map(make_nav_item).forEach(item => ul.appendChild(item));


        window.addEventListener('hashchange', () => {
            var hash = location.hash.substr(1);
            if (target != null && target.name === hash) return;
            go(page_by_name(hash));
        });

        if (location.hash) {
            var hash = location.hash.substr(1);
            var page = page_by_name(hash);
            go(page);
            if (localStorage.visited != null) target = page;    // fast forward
        }
        else go(pages[0]);

        return frame;
    };
});




require.config({
    waitSeconds: 0,
});

define('index',[
    'fokree', 'scenegraph',
    'fap', 'scene', 'fn',
    'ajax', 'nav', 'color',
], (fkr, scenegraph, fap, make_scene, fn, ajax, nav, clr) => {
    var request_render = () => {};
    var render_next = false;
    var drawcalls;
    var safe_frame = false;

    // init states and inputs
    var states = {};
    "x y z fov rot time".split(/\s+/).forEach(input => {
        var sum = (a, b) => a + b;
        var state = fap.state();
        var ctrls = Array.from(document.querySelectorAll(`div.control input[${input}]`));
        var disp = document.querySelector(`div.display div[${input}]`);

        var update = () => {
            var value = ctrls.map(e => parseFloat(e.value)).reduce(sum, 0);
            state.set(value);
            request_render();
        };

        states[input] = state;
        ctrls.forEach(e => e.addEventListener('input', update));
        update();
    });
    input_safe.addEventListener('change', ev => {
        safe_frame = ev.target.checked;
        request_render();
    });

    var loaded = (keyframes, pages, clusters) => {
        var scene = make_scene(states, keyframes, pages, clusters);
        var nav_frame = nav(
            document.querySelector('header > nav > ul'),
            pages.filter(p => p.url != null),
            () => request_render());

        var sg_render = scenegraph();
        var start_time = 0;
        var update = (time, xbound, ybound) => {
            var s = scene.sample(states.time.sample(0));
            drawcalls = sg_render(s, xbound, ybound);
            if (safe_frame)
                drawcalls.push({
                    name: 'safe_frame',
                    xbound,
                    ybound,
                });

            // update disp value based on scene animation
            for (var k in s) {
                var disp = document.querySelector(`div.display div[${k}]`);
                if (disp == null) continue;
                disp.textContent = `${k}: ${s[k].toFixed(3)}`;
            }

            time = nav_frame(time / 1000);
            render_next = (time != null);
            if (time != null) {
                input_time.value = time;
                input_time.dispatchEvent(new Event('input'));
            }
        };

        var draw = (ctx, next) => {
            request_render = next;
            if (render_next) next();
            drawcalls.forEach(dcall => fkr.draw(ctx, dcall));
        };

        var canvas = document.querySelector('canvas');
        var fkr_resize = fkr.canvas(canvas, update, draw);
        var resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            fkr_resize();
        };
        window.addEventListener('resize', resize);
        resize();

        document.querySelector('.dom-canvas > .loading').classList.add('done');
    };

    var content_ok = content => {
        var keyframes = fn.vmap(content.keyframes, spec => fap.tween(spec));
        var pages = content.pages;
        var clusters = content.clusters;
        clusters.forEach(c => c.color = clr.hex(c.color));
        var fonts = "text title menu code".split(/\s+/);

        var dom_canvas = document.querySelector('.dom-canvas');
        var loading_container = document.querySelector('.dom-canvas > .loading');
        var loading_progress_filler = document.querySelector('.dom-canvas > .loading > .progress > .filler');

        var populate_page = (page, html) => {
            // title
            var wrapper = document.createElement('div');
            var element = document.createElement('div');
            wrapper.setAttribute("class", "wrapper");
            element.setAttribute("class", "title");
            element.setAttribute("id", `${page.name}-title`);
            element.textContent = (html ? page.name.toUpperCase() : page.name);
            wrapper.appendChild(element);
            dom_canvas.appendChild(wrapper);
            page.title.element = element;

            // content
            if (html) {
                wrapper = document.createElement('div');
                element = document.createElement('div');
                wrapper.setAttribute("class", "wrapper");
                element.setAttribute("class", "content");
                element.setAttribute("id", `${page.name}-content`);
                element.appendChild(html);
                wrapper.appendChild(element);
                dom_canvas.appendChild(wrapper);
                page.content.element = element;
            }
        };

        var nload = 0;
        var load_done = () => {
            nload++;
            var total = pages.length + fonts.length;
            var percent = parseInt(nload / total * 100);
            loading_progress_filler.style.width = `${percent}%`;
            if (nload === total) loaded(keyframes, pages, clusters);
        };

        fonts.forEach(font => {
            var loading = document.createElement('div');
            loading.textContent = `Loading ${font} font...`;
            loading_container.appendChild(loading);

            document.fonts.load(`1em ${font}`).then(() => {
                loading.parentElement.removeChild(loading);
                load_done();
            });
        });
        pages.filter(page => page.url == null).forEach(page => {
            populate_page(page);
            load_done();
        });
        pages.filter(page => page.url != null).forEach(page => {
            var loading = document.createElement('div');
            loading.textContent = `Loading ${page.name}...`;
            loading_container.appendChild(loading);

            var page_fail = err => loading.textContent = `error loading ${page.url}: ${err}`;
            var page_ok = html => {
                var section = html.querySelector('section');
                if (section == null) return page_fail('bad document');
                populate_page(page, section);

                loading.parentElement.removeChild(loading);
                load_done();
            }
            ajax.html(page.url, page_ok, page_fail);
        });
    };
    var content_fail = err => document.querySelector('.dom-canvas > .loading').textContent = `error: ${err}`;
    ajax.get_json("./content.json", null, content_ok, content_fail);
});




require(['index']);


define("init", function(){});

