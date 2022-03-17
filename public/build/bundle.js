
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/assets/cards/choropleth - main.svelte generated by Svelte v3.46.4 */

    const file$2 = "src/assets/cards/choropleth - main.svelte";

    function create_fragment$2(ctx) {
    	let svg;
    	let defs;
    	let style;
    	let t0;
    	let title;
    	let t1;
    	let g1;
    	let g0;
    	let path;
    	let polygon0;
    	let polygon1;
    	let polygon2;
    	let polygon3;
    	let polygon4;
    	let polygon5;
    	let polygon6;
    	let polygon7;
    	let polygon8;
    	let polygon9;
    	let polygon10;
    	let polygon11;
    	let polygon12;
    	let polygon13;
    	let polygon14;
    	let polygon15;
    	let polygon16;
    	let polygon17;
    	let polygon18;
    	let polygon19;
    	let polygon20;
    	let polygon21;
    	let polygon22;
    	let polygon23;
    	let polygon24;
    	let polygon25;
    	let polygon26;
    	let polygon27;
    	let polygon28;
    	let polygon29;
    	let polygon30;
    	let polygon31;
    	let polygon32;
    	let polygon33;
    	let polygon34;
    	let polygon35;
    	let polygon36;
    	let polygon37;
    	let polygon38;
    	let polygon39;
    	let polygon40;
    	let polygon41;
    	let polygon42;
    	let polygon43;
    	let polygon44;
    	let polygon45;
    	let polygon46;
    	let polygon47;
    	let polygon48;
    	let polygon49;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			style = svg_element("style");
    			t0 = text(".cls-1{fill:none;}.cls-2{fill:#004c80;}.cls-3{fill:#006bb2;}.cls-4{fill:#005c99;}.cls-5{fill:#008ae5;}.cls-6{fill:#003d66;}.cls-7{fill:#09f;}.cls-8{fill:#007acc;}");
    			title = svg_element("title");
    			t1 = text("Asset 28main");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			path = svg_element("path");
    			polygon0 = svg_element("polygon");
    			polygon1 = svg_element("polygon");
    			polygon2 = svg_element("polygon");
    			polygon3 = svg_element("polygon");
    			polygon4 = svg_element("polygon");
    			polygon5 = svg_element("polygon");
    			polygon6 = svg_element("polygon");
    			polygon7 = svg_element("polygon");
    			polygon8 = svg_element("polygon");
    			polygon9 = svg_element("polygon");
    			polygon10 = svg_element("polygon");
    			polygon11 = svg_element("polygon");
    			polygon12 = svg_element("polygon");
    			polygon13 = svg_element("polygon");
    			polygon14 = svg_element("polygon");
    			polygon15 = svg_element("polygon");
    			polygon16 = svg_element("polygon");
    			polygon17 = svg_element("polygon");
    			polygon18 = svg_element("polygon");
    			polygon19 = svg_element("polygon");
    			polygon20 = svg_element("polygon");
    			polygon21 = svg_element("polygon");
    			polygon22 = svg_element("polygon");
    			polygon23 = svg_element("polygon");
    			polygon24 = svg_element("polygon");
    			polygon25 = svg_element("polygon");
    			polygon26 = svg_element("polygon");
    			polygon27 = svg_element("polygon");
    			polygon28 = svg_element("polygon");
    			polygon29 = svg_element("polygon");
    			polygon30 = svg_element("polygon");
    			polygon31 = svg_element("polygon");
    			polygon32 = svg_element("polygon");
    			polygon33 = svg_element("polygon");
    			polygon34 = svg_element("polygon");
    			polygon35 = svg_element("polygon");
    			polygon36 = svg_element("polygon");
    			polygon37 = svg_element("polygon");
    			polygon38 = svg_element("polygon");
    			polygon39 = svg_element("polygon");
    			polygon40 = svg_element("polygon");
    			polygon41 = svg_element("polygon");
    			polygon42 = svg_element("polygon");
    			polygon43 = svg_element("polygon");
    			polygon44 = svg_element("polygon");
    			polygon45 = svg_element("polygon");
    			polygon46 = svg_element("polygon");
    			polygon47 = svg_element("polygon");
    			polygon48 = svg_element("polygon");
    			polygon49 = svg_element("polygon");
    			add_location(style, file$2, 0, 68, 68);
    			add_location(defs, file$2, 0, 62, 62);
    			add_location(title, file$2, 0, 252, 252);
    			attr_dev(path, "class", "cls-1");
    			attr_dev(path, "d", "M28.5,0,52.33,6l4,1,49.42,8.33L135,17.3l7.91-.21,2.9,1.83,2.64.63,4.18.81,1.19-.47,1,.77-.17,1.1,4,.85L164.7,22l2.34.17.47,1-5,2-2.05,1.42-.71,1.81-1.93.8L156.31,31l.12.85,3.81-.9,1.7-1.08,1,.68-.24,1.3,2,.29.47-1.87,5-1.53V27.23l3.93-2,1,.91L172.32,28l-.41,2.49,1.05.34,1.35-1.42,2.76,1.93,1.35-.23,1.64,1,2.23-2.27L187,28.37l.64.56v1.25l.59.74,1.52-1,1.59,1.31.35.85,3.16.51v.9h-4.92l-.53.74h-1l0-.91-2.87-.51-1.11,1.42h-2.11l-.59,3.18-1.06-.23-.35-2.1L178,37,177,40.55l-2.4,3.4-.3,1.82,1.35-.29.24-2,2-1.58.47-1.82,1.41-1.58.76.39-3.17,6.92-.94,3.88,1.06,4.59L177,56.58l2.42,4.25,1.4.38,1.41-.89,2.16-3.49.39-5.35-1.89-2.64-.35-2,.84-1.78-.53-2.77L185,40.94l1-2.22,1.06.22-.75,2.12,1.14.13.62-1.4v-2l1-.68-.35-1.28,1.72-1.1,1.45,1,3.91.8,1.23,1.87-.53,1.32,1,2.6-1.05,2.76-1.37.21-.39,1.87,1.49.89,1.32-1.31V45.27l2-.72,1.93.93,2,6.08v2.26l-1.8-.22-.26.73.79.76-.44,2.13-1.58,2.12,1.53,1.19,4.14-2.08,1.52.92,3.29-3.23,1.93.06,3.28-2.1L219.4,50l-1.23-1.7-.12-1.76,4.63-1.3,2.17,1.13,2.35-1.13,2.05-1.59,1.29-.45L229,39.7l1.52-1.53,1.17-2.89,2.52-2.72,6.69-1.3L249.24,29V27.67l1.37-.51,1.18-.51,1-4.33-1.19-3.49,2.11-6.8,1.32,1.15,2.07-.94,3.73.94,3.52,8.37,2.9.38,2.73,3.4-2.68,3.28-2.42,1.15-1.06-.68-1.71-.34.13,4.33-1.71-.21v2.46l-.84.39-1-1.11-.7.51v3.23l-.53,1.4-1.14.56-.27.89,1.21.89L255.84,45l.94.49,1-.54,1.93,2.41,2.23-.66L260.18,45l.47-.51,2.43,1.79-.15,1.56-3.07,1-.88-.62-1.23,1.58-3.49,1.9-1.94.71-3.22.88L248,54.61l-2.11,1.1-1.23.49L243.44,59l.67.71,1.24-.34.2,2.39-2.24,6h-.71l-.17-1.41L240.85,66l.13,1.28,1.27,1.32,2.07,2.51-.26,1.7h1.53l-.39,1,.13,2.81L241.81,78,241,75.37l-.92.55-1.32-1.15-.66-5.27,1.19-1.78L238,67,235.88,70,237.06,71l.14,3.61,1.71,1.92-.18,1.1-1-.17.53,1.87H236l0,.77,2.29.47,1.19,1.88-.62.58-1.71-1.49-3-.17-.26.81,2.59.47,2.42,1.4,3-.59-.08,1.44L245,89.1l-.66.55-2.2-2.85-.7,1-2.25.08-1.84,1.49.57,1L240.19,89l.92.81.66-1.07,1,.13.08,2-1.49,2.42L239.22,92l-1.85,1.19.09.72h3.08l1.58.85L241,96.62H239.7l-1.49.94-1.63-.34-1.14,1.36.35,1.7-1,1.23.53,1.95h-.79l-1.19-.85-2.07,1.32-2.9,2.59-2.11,4.6L224,113.24l-2.72,2-3.52-1v2.29h1.85l.44,1.28-2.47,3,.09,5.36,2.67,8.39,2.58,3.4-1.12,1,3,4.82,3.26,5.83v4.68l-1.67,2.12.7,1.7L225,160H221.8l-.26-2.38,1.67-.94-.35-1.53-2.37.34-1.85-3.57-2,.94L215.3,151l1.93-.77-.35-1.36-2.29.34-1.76-1.7,1.41-2.29-.26-2.47-.79,0-.27,2.21-.85-.06-1-2.15,1.06-2.27-.12-2.69-.91-1.76-1.9.63L207,133l-1.82-.74-.32-1.16-2.08-.2-.74,1.48-5.33,2-.53-1.45-3.3-2.5-2.28.12L190,129.1l-1.23.68-.35,1.48-1.85.05-2.11-.26-1.45.72-1-4.88-1.27-.34.61,4.59-1.71.17-3.83,0-2.11.89-2.86-.81-2.33-.08L167,132.62l.53.86,1.54-.43.7.85,2-1L174.4,134,173,135.52l.79,1.48,2.11,1.07-.4,1.27-2.41-.08-.49-1.62-1.45-1-.44.6.7,1.06-1.49.85-2.24.34-1.59-.59L166,138l-1.72.43-.7-.64,1.23-1.87-.75-.55-1,1.1-.75-.72.18-1.4-3.39.13v1l2.33,1.28-.17.72-5.28-1-2.77-1.27-3.12.93-1.8,0-2.07,1.45-1.1-1.15-.22-1.49-1.76.85.84,1.19v1.15l1.1.72-.8,1-1.49-.17L141,141.21l-2.77,1.15-3.52,1.44-1.36-.51-1.28,1.11-.52,2.29-2.86-.25-.13.72,1.49.73-.48,2.33a9.42,9.42,0,0,0-1.89-.25c0,.13-.18,1.15-.18,1.15l1.36,1,.84,2.43-.09,1.19,1,1.1,0,2.38h-1.67l-.83-1.44-5.15-.34-2.46-2.21-.18-1.62-2.06-1.7-.58-3.74-2.33-1.62-2.68-6.84-3.43-4.25-7.3-2.38-2.29,1.62-1.31,3.4-1.59.68-1.84-2.13-3.35-1.44-1.76-2.3L88.48,127l-4-2.8L83.64,122l-2.11-1.28-.44-1.61-9.32-1.62-.62,3L67,119.7l-11.09-1.78L36.64,107.38l.94-1.88-13.37-1-.76-1.75,1.29-1.31-.23-1.7-1.94-1.58.3-1.36L19,96.15l.7-2.21-5.51-4.19L10,88.56l-1.35-1.7.94-1V81.81l-2-2.55L5.16,74l.7-1.13L4.05,71.67l.76-5.44,1.35-.46,0,1.87L7.5,68.83l.88-.62L7.09,64.36,8.5,64l1.94.73.76-1.41-4.75-.4-.53,1.64L3.58,64,3.11,62.2l1.35-.56-.41-1.25L2,57.1l-.93.51L0,56.42,2.46,55,1.88,53.3l.88-1.19-.18-3.17L1.76,47,4,44.58l.17-2.1,1.35-2.1-.64-1.53,1.23-1,.14-3.57-1.18-1.4.57-.94,1.85.43,1.4-3.66,2.73-4.16,2.11-4.81,2.46-3.1.44-2.8-.57-3.11.92-.17.31,2.13,1.1.21.4-3L17.11,8.8,18.6,6.72l.48-2.21-1.36-2L18.82.34l2.11,2.3,4.84,1.48,1.14,2L25.72,9.56l.75.68.71-1.65.88-2,1,1.06.79-.63L28,4.55l.92-2.38Z");
    			add_location(path, file$2, 0, 353, 353);
    			attr_dev(polygon0, "class", "cls-2");
    			attr_dev(polygon0, "points", "184.47 131.05 184.47 127.04 198 126.02 198.53 127.61 213.13 126.87 213.54 127.72 214.48 127.67 215 125.4 215.82 125.4 216.29 126.14 217.67 125.85 220.53 134.72 222.92 137.87 221.81 138.89 228.05 149.54 228.05 154.22 226.38 156.34 227.08 158.04 224.97 160 221.81 160 221.54 157.62 223.21 156.68 222.86 155.15 220.49 155.49 218.64 151.92 216.62 152.86 215.3 150.99 217.23 150.22 216.88 148.86 214.59 149.2 212.83 147.5 214.24 145.21 213.98 142.74 213.19 142.77 212.92 144.98 212.07 144.92 211.07 142.77 212.13 140.5 212.01 137.81 211.1 136.05 209.2 136.68 207.03 133.02 205.21 132.28 204.89 131.12 202.81 130.93 202.07 132.4 196.74 134.41 196.21 132.97 192.91 130.46 190.63 130.58 190.01 129.1 188.78 129.78 188.43 131.26 186.58 131.31 184.47 131.05");
    			add_location(polygon0, file$2, 0, 4341, 4341);
    			attr_dev(polygon1, "class", "cls-3");
    			attr_dev(polygon1, "points", "198 126.02 197.12 122.34 197.12 119.33 198 118.03 198 117.24 196.01 113.95 193.19 101.59 198 101.14 206.26 100.23 206.26 101.08 205.27 101.82 211.54 107.83 216.18 111.97 216.7 113.55 217.76 114.18 217.76 116.47 219.61 116.47 220.05 117.75 217.58 120.72 217.67 125.85 216.29 126.14 215.82 125.4 215 125.4 214.48 127.67 213.54 127.72 213.13 126.87 198.53 127.61 198 126.02");
    			add_location(polygon1, file$2, 0, 5122, 5122);
    			attr_dev(polygon2, "class", "cls-4");
    			attr_dev(polygon2, "points", "193.19 101.59 179.06 102.39 179.06 102.95 179.59 103.63 179.06 122 179.68 131.31 181.39 131.14 180.78 126.55 182.05 126.89 183.02 131.78 184.47 131.05 184.47 127.04 198 126.02 197.12 122.34 197.12 119.33 198 118.03 198 117.24 196.01 113.95 193.19 101.59");
    			add_location(polygon2, file$2, 0, 5526, 5526);
    			attr_dev(polygon3, "class", "cls-4");
    			attr_dev(polygon3, "points", "206.26 100.23 209.49 98.65 216.29 98.14 218.99 99.72 223.86 98.82 227.78 101.59 231.3 103.93 228.4 106.53 226.29 111.12 224 113.24 221.28 115.2 217.76 114.18 216.7 113.55 216.18 111.97 205.27 101.82 206.26 101.08 206.26 100.23");
    			add_location(polygon3, file$2, 0, 5813, 5813);
    			attr_dev(polygon4, "class", "cls-2");
    			attr_dev(polygon4, "points", "199 99.55 201.17 98.53 203.1 98.53 206.26 94.96 207.56 94.96 210.25 91.96 211.54 91.5 213.01 89.47 227.61 87.48 241.86 84.93 244.98 89.1 244.32 89.65 242.12 86.8 241.42 87.78 239.17 87.86 237.33 89.35 237.9 90.33 240.19 88.97 241.11 89.78 241.77 88.71 242.74 88.84 242.82 90.8 241.33 93.22 239.22 92.03 237.37 93.22 237.46 93.94 240.54 93.94 242.12 94.79 241.02 96.62 239.7 96.62 238.21 97.56 236.58 97.22 235.44 98.58 235.79 100.28 234.82 101.51 235.35 103.46 234.56 103.46 233.37 102.61 231.3 103.93 223.86 98.82 218.99 99.72 216.29 98.14 209.49 98.65 206.26 100.23 198 101.14 199 99.55");
    			add_location(polygon4, file$2, 0, 6073, 6073);
    			attr_dev(polygon5, "class", "cls-3");
    			attr_dev(polygon5, "points", "179.06 102.39 168.98 102.39 168.04 103.93 168.04 104.77 165.34 108.39 164.64 110.27 165.4 112.25 165.4 113.61 164.64 114.74 164.99 115.48 164.99 118.03 165.63 119.5 164.29 122.68 162 128.01 171.97 127.72 172.14 128.57 171.73 129.59 173.74 132.24 175.85 131.35 179.68 131.31 179.06 122 179.59 103.63 179.06 102.95 179.06 102.39");
    			add_location(polygon5, file$2, 0, 6695, 6695);
    			attr_dev(polygon6, "class", "cls-5");
    			attr_dev(polygon6, "points", "164.99 115.48 148.1 115.48 148.1 120.81 149.34 122.17 150.39 126.81 151.33 127.72 150.63 130.22 151.21 131.78 151.09 133.62 149.92 135.09 150.04 136.11 153.16 135.18 155.93 136.45 161.21 137.47 161.38 136.75 159.05 135.47 159.05 134.5 162.44 134.37 162.26 135.77 163.01 136.49 164.02 135.39 164.77 135.94 163.54 137.81 164.24 138.45 165.96 138.02 166.13 138.92 167.72 139.51 169.96 139.17 171.45 138.32 170.75 137.26 171.19 136.66 172.73 137.94 173.13 139.26 175.54 139.34 175.94 138.07 173.83 137 173.04 135.51 174.4 133.99 171.72 132.92 169.74 133.9 169.04 133.05 167.5 133.47 166.97 132.63 168.55 131.35 170.88 131.44 173.74 132.24 171.73 129.59 172.14 128.57 171.97 127.72 162 128.01 165.63 119.5 164.99 118.03 164.99 115.48");
    			add_location(polygon6, file$2, 0, 7055, 7055);
    			attr_dev(polygon7, "class", "cls-5");
    			attr_dev(polygon7, "points", "213.01 89.47 201.75 90.66 178.77 92.19 179.06 93.21 172.03 93.49 171.26 95.87 171.26 97.68 170.84 99.67 169.27 100.8 168.98 102.39 179.06 102.39 193.19 101.59 198 101.14 199 99.55 201.17 98.53 203.1 98.53 206.26 94.96 207.56 94.96 210.25 91.96 211.54 91.5 213.01 89.47");
    			add_location(polygon7, file$2, 0, 7817, 7817);
    			attr_dev(polygon8, "class", "cls-4");
    			attr_dev(polygon8, "points", "241.86 84.93 241.94 83.49 238.91 84.08 236.49 82.68 233.9 82.21 234.16 81.4 237.11 81.57 238.82 83.06 239.44 82.48 238.25 80.59 235.96 80.13 236.01 79.36 238.25 79.36 237.72 77.49 234.41 75.81 232.77 75.81 232.3 74.28 233 73.31 232.53 72.18 230.78 71.72 229.95 70.14 228.72 70.14 227.26 71.84 225.73 71.95 225.26 73.94 223.8 74.39 223.39 76.03 222.57 76.83 220.75 76.43 220.05 76.77 220.4 77.9 219.75 78.58 218.29 78.81 217.23 80.28 217.23 81.98 216.65 82.48 215.12 82.48 214.12 83.29 213.01 82.72 212.01 83.23 211.37 84.93 210.02 84.14 209.02 82.72 208.44 82.83 208.44 84.48 206.62 85.61 204.74 87.94 201.75 90.66 213.01 89.47 227.61 87.48 241.86 84.93");
    			add_location(polygon8, file$2, 0, 8119, 8119);
    			attr_dev(polygon9, "class", "cls-3");
    			attr_dev(polygon9, "points", "228.72 70.14 227.87 68.52 224.53 68.81 222.27 70.48 221.19 72.52 220.28 72.86 219.78 68.67 239.34 65.66 241.94 74.22 245.2 73.79 245.33 76.6 241.81 77.96 241.02 75.37 240.1 75.92 238.78 74.77 238.12 69.5 239.31 67.72 238.03 67.03 235.88 69.97 237.06 71.03 237.19 74.64 238.91 76.56 238.74 77.66 237.72 77.49 234.41 75.81 232.77 75.81 232.3 74.28 233 73.31 232.53 72.18 230.78 71.72 229.95 70.14 228.72 70.14");
    			add_location(polygon9, file$2, 0, 8806, 8806);
    			attr_dev(polygon10, "class", "cls-6");
    			attr_dev(polygon10, "points", "239.34 65.66 239.81 65.09 240.84 66.02 240.98 67.29 244.32 71.12 244.06 72.82 245.59 72.82 245.2 73.79 241.94 74.22 239.34 65.66");
    			add_location(polygon10, file$2, 0, 9247, 9247);
    			attr_dev(polygon11, "class", "cls-4");
    			attr_dev(polygon11, "points", "239.81 65.09 240.3 63.79 241.42 63.65 241.94 62.91 241.94 61.61 240.45 61.01 239.6 59.51 239.6 56.96 240.6 55.77 240.6 54.92 244.7 56.2 243.44 59 244.11 59.71 245.34 59.37 245.55 61.76 243.31 67.76 242.6 67.76 242.43 66.36 240.84 66.02 239.81 65.09");
    			add_location(polygon11, file$2, 0, 9409, 9409);
    			attr_dev(polygon12, "class", "cls-2");
    			attr_dev(polygon12, "points", "240.6 54.92 239.13 54.41 238.34 52.97 236.4 51.48 216.13 55.47 215.82 54.1 212.54 56.2 214.42 68.44 214.55 69.66 219.78 68.67 239.34 65.66 239.81 65.09 240.3 63.79 241.42 63.65 241.94 62.91 241.94 61.61 240.45 61.01 239.6 59.51 239.6 56.96 240.6 55.77 240.6 54.92");
    			add_location(polygon12, file$2, 0, 9691, 9691);
    			attr_dev(polygon13, "class", "cls-3");
    			attr_dev(polygon13, "points", "245.93 55.71 245.55 55.13 245.93 54.16 244.94 50.67 244.94 49.27 244.94 45.27 244.67 44.25 243.75 40.09 242.82 39.62 242.82 38.22 242.25 34.69 241.28 33.28 240.92 31.26 234.24 32.56 231.71 35.28 230.54 38.17 229.02 39.7 230.54 43.16 229.25 43.61 227.2 45.2 224.85 46.33 222.68 45.2 218.05 46.5 218.17 48.26 219.4 49.96 215.82 54.1 216.13 55.47 236.4 51.48 238.34 52.97 239.13 54.41 240.6 54.92 244.7 56.2 245.93 55.71");
    			add_location(polygon13, file$2, 0, 9988, 9988);
    			attr_dev(polygon14, "class", "cls-3");
    			attr_dev(polygon14, "points", "245.33 57.34 246.12 56.2 248.15 55.39 250.52 54.49 251.57 53.43 252.1 53.65 251.09 54.62 251.53 54.92 252.54 54.03 254.3 53.13 254.3 53.6 251.75 55.73 249.99 57.34 248.45 57.56 248.01 57.09 245.93 58.45 244.63 58.45 244.63 57.68 245.33 57.34");
    			add_location(polygon14, file$2, 0, 10439, 10439);
    			attr_dev(polygon15, "class", "cls-7");
    			attr_dev(polygon15, "points", "244.94 49.27 253.33 47.44 254.3 50.37 254.26 51.66 252.32 52.37 249.1 53.25 248.04 54.61 245.93 55.71 245.55 55.13 245.93 54.16 244.94 50.67 244.94 49.27");
    			add_location(polygon15, file$2, 0, 10714, 10714);
    			attr_dev(polygon16, "class", "cls-2");
    			attr_dev(polygon16, "points", "253.33 47.44 255.14 46.72 255.88 48.42 256.9 48.42 257.75 49.76 254.26 51.66 254.3 50.37 253.33 47.44");
    			add_location(polygon16, file$2, 0, 10901, 10901);
    			attr_dev(polygon17, "class", "cls-4");
    			attr_dev(polygon17, "points", "244.67 44.25 248.61 43.61 254.17 42.38 254.48 41.55 256.1 41.19 257.31 42.08 255.84 44.97 256.78 45.45 257.77 44.92 259.71 47.33 261.94 46.67 260.18 45 260.65 44.49 263.08 46.28 262.94 47.84 259.86 48.8 258.98 48.18 257.75 49.76 256.9 48.42 255.88 48.42 255.14 46.72 253.33 47.44 244.94 49.27 244.94 45.27 244.67 44.25");
    			add_location(polygon17, file$2, 0, 11036, 11036);
    			attr_dev(polygon18, "class", "cls-8");
    			attr_dev(polygon18, "points", "249.24 28.99 249.24 31.26 249.83 31.65 249.83 32.9 248.13 34.06 248.72 35.37 248.34 38.14 248.78 41.52 248.61 43.61 244.67 44.25 243.75 40.09 242.82 39.62 242.82 38.22 242.25 34.69 241.28 33.28 240.92 31.26 249.24 28.99");
    			add_location(polygon18, file$2, 0, 11388, 11388);
    			attr_dev(polygon19, "class", "cls-7");
    			attr_dev(polygon19, "points", "256.37 40.3 255.54 39.87 250.61 27.16 249.24 27.67 249.24 28.99 249.24 31.26 249.83 31.65 249.83 32.9 248.13 34.06 248.72 35.37 248.34 38.14 248.78 41.52 248.61 43.61 254.17 42.38 254.48 41.55 256.1 41.19 256.37 40.3");
    			add_location(polygon19, file$2, 0, 11641, 11641);
    			attr_dev(polygon20, "class", "cls-8");
    			attr_dev(polygon20, "points", "250.61 27.16 251.79 26.65 252.81 22.32 251.62 18.83 253.73 12.03 255.05 13.18 257.12 12.24 260.85 13.18 264.37 21.55 267.27 21.93 270 25.34 267.32 28.61 264.9 29.76 263.84 29.07 262.13 28.73 262.26 33.07 260.55 32.86 260.55 35.32 259.71 35.71 258.74 34.6 258.04 35.11 258.04 38.34 257.51 39.74 256.37 40.3 255.54 39.87 250.61 27.16");
    			add_location(polygon20, file$2, 0, 11891, 11891);
    			attr_dev(polygon21, "class", "cls-8");
    			attr_dev(polygon21, "points", "208.44 82.83 207.88 81.39 207.15 81.39 206.88 79.75 207.66 78.61 207.47 77.39 208.44 76.51 208.26 75.38 208.88 74.76 209.99 74.76 210.22 72.92 211.4 72.46 213.16 70.14 213.16 69.03 214.42 68.44 214.55 69.66 219.78 68.67 220.28 72.86 221.19 72.52 222.27 70.48 224.53 68.81 227.87 68.52 228.72 70.14 227.26 71.84 225.73 71.95 225.26 73.94 223.8 74.39 223.39 76.03 222.57 76.83 220.75 76.43 220.05 76.77 220.4 77.9 219.75 78.58 218.29 78.81 217.23 80.28 217.23 81.98 216.65 82.48 215.12 82.48 214.12 83.29 213.01 82.72 212.01 83.23 211.37 84.93 210.02 84.14 209.02 82.72 208.44 82.83");
    			add_location(polygon21, file$2, 0, 12256, 12256);
    			attr_dev(polygon22, "class", "cls-7");
    			attr_dev(polygon22, "points", "200.13 59.34 192.3 59.72 194.19 75.62 195.24 75.62 196.65 76.51 198.94 76.51 200.39 77.24 202.76 77.53 203.73 76.85 206.06 78.51 207.66 78.61 207.47 77.39 208.44 76.51 208.26 75.38 208.88 74.76 209.99 74.76 210.22 72.92 211.4 72.46 213.16 70.14 213.16 69.03 214.42 68.44 212.54 56.2 210.61 56.14 207.32 59.37 205.8 58.45 201.66 60.53 200.13 59.34");
    			add_location(polygon22, file$2, 0, 12870, 12870);
    			attr_dev(polygon23, "class", "cls-2");
    			attr_dev(polygon23, "points", "194.19 75.62 194.19 77.24 193.53 77.96 192.3 78.13 191.42 79.15 191.73 80.59 189.53 83.15 188.53 83.15 187.59 82 186.93 82.21 186.93 83.4 186.45 83.95 185.31 83.57 184.6 84.25 183.11 84.25 181.83 83.91 180.65 84.25 180.03 84.93 179.06 85.36 178.27 88.08 177.44 88.08 176.86 89.27 174.75 89.01 174.14 89.47 173.65 90.66 174.09 91.56 173.65 92.58 171.98 92.8 172.03 93.49 179.06 93.21 178.77 92.19 201.75 90.66 204.74 87.94 206.62 85.61 208.44 84.48 208.44 82.83 207.88 81.39 207.15 81.39 206.88 79.75 207.66 78.61 206.06 78.51 203.73 76.85 202.76 77.53 200.39 77.24 198.94 76.51 196.65 76.51 195.24 75.62 194.19 75.62");
    			add_location(polygon23, file$2, 0, 13250, 13250);
    			attr_dev(polygon24, "class", "cls-4");
    			attr_dev(polygon24, "points", "192.3 59.72 182.27 60.32 180.87 61.21 179.46 60.83 180.53 76.43 181.11 78.61 179.06 82.48 179.06 85.36 180.03 84.93 180.65 84.25 181.83 83.91 183.11 84.25 184.6 84.25 185.31 83.57 186.45 83.95 186.93 83.4 186.93 82.21 187.59 82 188.53 83.15 189.53 83.15 191.73 80.59 191.42 79.15 192.3 78.13 193.53 77.96 194.19 77.24 194.19 75.62 192.3 59.72");
    			add_location(polygon24, file$2, 0, 13900, 13900);
    			attr_dev(polygon25, "class", "cls-8");
    			attr_dev(polygon25, "points", "179.46 60.83 177.04 56.58 163.52 56.82 165.52 58.35 166.98 60.22 167.16 61.64 164.52 63.45 164.4 64.24 162.82 64.81 162.82 67.59 161.71 68.95 161.3 70.93 161.3 74.28 162.41 75.62 164.05 75.62 165.34 78.61 167.04 78.61 167.98 79.49 168.1 81.19 167.28 82.48 170.09 85.61 170.91 85.61 171.5 86.86 171.44 88.67 172.44 89.92 173.65 90.66 174.14 89.47 174.75 89.01 176.86 89.27 177.44 88.08 178.27 88.08 179.06 85.36 179.06 82.48 181.11 78.61 180.53 76.43 179.46 60.83");
    			add_location(polygon25, file$2, 0, 14276, 14276);
    			attr_dev(polygon26, "class", "cls-7");
    			attr_dev(polygon26, "points", "177.04 56.58 177.48 54.24 176.42 49.65 177.36 45.77 180.53 38.85 179.76 38.46 178.36 40.04 177.89 41.86 175.9 43.44 175.66 45.48 174.31 45.77 174.61 43.95 177.01 40.55 176.2 39.62 175.85 37.7 174.31 35.96 168.64 33.5 166.93 33.71 164.7 32.11 162.7 31.82 162.94 30.52 161.94 29.84 160.24 30.92 156.43 31.82 156.43 35.45 155.32 36.73 153.73 36.77 154.57 40.55 153.73 41.4 153.73 43.21 155.58 45.19 156.77 45.06 158.35 47.18 159.89 47.48 159.93 48.8 161.08 49.1 161.3 51.35 162 52.07 161.91 53.22 161.3 54.24 161.87 55.39 163.52 56.82 177.04 56.58");
    			add_location(polygon26, file$2, 0, 14772, 14772);
    			attr_dev(polygon27, "class", "cls-2");
    			attr_dev(polygon27, "points", "164.7 32.11 165.17 30.24 170.15 28.71 170.15 27.23 174.08 25.19 175.13 26.1 172.32 28.03 171.91 30.52 172.96 30.86 174.31 29.44 177.07 31.37 178.42 31.14 180.06 32.11 182.29 29.84 186.98 28.37 187.62 28.93 187.62 30.18 188.21 30.92 189.73 29.95 191.32 31.26 191.67 32.11 194.83 32.62 194.83 33.52 189.91 33.52 189.38 34.26 188.33 34.26 188.38 33.35 185.51 32.84 184.4 34.26 182.29 34.26 181.7 37.44 180.65 37.21 180.29 35.11 177.95 37.04 177.01 40.55 176.2 39.62 175.85 37.7 174.31 35.96 168.64 33.5 166.93 33.71 164.7 32.11");
    			add_location(polygon27, file$2, 0, 15350, 15350);
    			attr_dev(polygon28, "class", "cls-2");
    			attr_dev(polygon28, "points", "182.89 42.25 185.04 40.94 186.01 38.73 187.06 38.94 186.32 41.06 187.46 41.19 188.08 39.79 188.08 37.79 189.13 37.11 188.78 35.83 190.5 34.73 191.95 35.71 195.86 36.51 197.09 38.38 196.56 39.7 197.53 42.3 196.48 45.06 195.11 45.27 194.72 47.14 196.21 48.03 197.53 46.72 197.53 45.27 199.51 44.55 201.44 45.48 203.42 51.56 203.42 53.81 201.62 53.6 201.36 54.33 202.15 55.09 201.71 57.22 200.13 59.34 192.3 59.72 182.27 60.32 184.43 56.83 184.82 51.48 182.93 48.84 182.58 46.8 183.41 45.02 182.89 42.25");
    			add_location(polygon28, file$2, 0, 15908, 15908);
    			attr_dev(polygon29, "class", "cls-4");
    			attr_dev(polygon29, "points", "171.26 95.87 168.98 95.93 168.33 94.83 168.68 93.49 145.38 93.98 146.3 103 146.39 111.75 148.1 112.39 148.1 115.48 164.99 115.48 164.64 114.74 165.4 113.61 165.4 112.25 164.64 110.27 165.34 108.39 168.04 104.77 168.04 103.93 168.98 102.39 169.27 100.8 170.84 99.67 171.26 97.68 171.26 95.87");
    			add_location(polygon29, file$2, 0, 16442, 16442);
    			attr_dev(polygon30, "class", "cls-5");
    			attr_dev(polygon30, "points", "161.3 70.93 159.24 68.83 141.24 69.17 141.95 72.54 144.41 73.62 144.53 74.5 143.94 75.35 143.94 76.77 145.38 78.13 145.38 90.94 145.38 93.98 168.68 93.49 168.33 94.83 168.98 95.93 171.26 95.87 172.03 93.49 171.98 92.8 173.65 92.58 174.09 91.56 173.65 90.66 172.44 89.92 171.44 88.67 171.5 86.86 170.91 85.61 170.09 85.61 167.28 82.48 168.1 81.19 167.98 79.49 167.04 78.61 165.34 78.61 164.05 75.62 162.41 75.62 161.3 74.28 161.3 70.93");
    			add_location(polygon30, file$2, 0, 16766, 16766);
    			attr_dev(polygon31, "class", "cls-2");
    			attr_dev(polygon31, "points", "163.52 56.82 161.87 55.39 161.3 54.24 161.91 53.22 162 52.07 161.3 51.35 137.11 51.09 135.97 51.09 136.98 52.58 137.11 57.13 138.12 59.3 138.74 61 138.87 63.04 139.97 64.53 139.88 67.89 141.24 69.17 159.24 68.83 161.3 70.93 161.71 68.95 162.82 67.59 162.82 64.81 164.4 64.24 164.52 63.45 167.16 61.64 166.98 60.22 165.52 58.35 163.52 56.82");
    			add_location(polygon31, file$2, 0, 17234, 17234);
    			attr_dev(polygon32, "class", "cls-3");
    			attr_dev(polygon32, "points", "137.11 51.09 137.11 39.65 137.11 35.56 137.11 31.14 136.26 25.48 134.68 20.32 134.96 17.3 142.87 17.09 145.77 18.92 148.41 19.55 152.59 20.36 153.78 19.89 154.74 20.66 154.57 21.76 158.53 22.61 164.7 22.02 167.04 22.19 167.51 23.15 162.47 25.19 160.42 26.61 159.71 28.42 157.78 29.22 156.31 30.97 156.43 31.82 156.43 35.45 155.32 36.73 153.73 36.77 154.57 40.55 153.73 41.4 153.73 43.21 155.58 45.19 156.77 45.06 158.35 47.18 159.89 47.48 159.93 48.8 161.08 49.1 161.3 51.35 137.11 51.09");
    			add_location(polygon32, file$2, 0, 17607, 17607);
    			attr_dev(polygon33, "class", "cls-2");
    			attr_dev(polygon33, "points", "137.11 35.56 120 35.03 103.6 33.88 105.71 15.39 134.96 17.3 134.68 20.32 136.26 25.48 137.11 31.14 137.11 35.56");
    			add_location(polygon33, file$2, 0, 18128, 18128);
    			attr_dev(polygon34, "class", "cls-8");
    			attr_dev(polygon34, "points", "103.6 33.88 102.9 39.83 101.36 52.07 121.02 53.48 124.14 54.84 126.51 55.13 128.76 56.15 132.19 55.39 134.34 55.81 137.11 57.13 136.98 52.58 135.97 51.09 137.11 51.09 137.11 35.56 120 35.03 103.6 33.88");
    			add_location(polygon34, file$2, 0, 18273, 18273);
    			attr_dev(polygon35, "class", "cls-6");
    			attr_dev(polygon35, "points", "101.36 52.07 99.97 64.07 109.82 65.15 109.35 70.93 126.41 71.89 141.95 72.54 141.24 69.17 139.88 67.89 139.97 64.53 138.87 63.04 138.74 61 138.12 59.3 137.11 57.13 134.34 55.81 132.19 55.39 128.76 56.15 126.51 55.13 124.14 54.84 121.02 53.48 101.36 52.07");
    			add_location(polygon35, file$2, 0, 18508, 18508);
    			attr_dev(polygon36, "class", "cls-2");
    			attr_dev(polygon36, "points", "109.35 70.93 107.49 89.43 126.41 90.2 145.38 90.94 145.38 78.13 143.94 76.77 143.94 75.35 144.53 74.5 144.41 73.62 141.95 72.54 109.35 70.93");
    			add_location(polygon36, file$2, 0, 18796, 18796);
    			attr_dev(polygon37, "class", "cls-6");
    			attr_dev(polygon37, "points", "107.49 89.43 102.31 89.18 101.96 91.96 117.2 93.49 116.97 105.56 120.49 106.13 121.95 107.83 124.48 108.45 125.71 109.47 126.27 109.29 126.27 108.63 127.11 108.65 128.51 110.84 132.66 110.84 133.67 109.59 135.79 110.18 136.23 111.35 137.11 111.35 137.86 110.5 143.13 110.37 145.69 112.31 146.39 111.75 146.3 103 145.38 93.98 145.38 90.94 107.49 89.43");
    			add_location(polygon37, file$2, 0, 18970, 18970);
    			attr_dev(polygon38, "class", "cls-3");
    			attr_dev(polygon38, "points", "101.96 91.96 99.72 119.62 81.23 117.83 81.09 119.11 81.53 120.72 83.64 122 84.52 124.21 88.48 127.01 89.8 132.88 91.55 135.18 94.9 136.62 96.74 138.75 98.33 138.07 99.64 134.66 101.93 133.05 109.23 135.43 112.66 139.68 115.34 146.53 117.67 148.14 118.25 151.88 120.31 153.58 120.49 155.2 122.95 157.41 128.1 157.75 128.93 159.19 130.6 159.19 130.56 156.81 129.59 155.71 129.68 154.52 128.84 152.09 127.48 151.12 127.66 149.97 129.55 150.22 130.03 147.88 128.54 147.16 128.67 146.44 131.53 146.69 132.05 144.4 133.33 143.29 134.69 143.8 140.98 141.21 142.74 139.72 144.24 139.89 145.03 138.87 143.93 138.15 143.93 137 143.09 135.81 144.85 134.96 145.07 136.45 146.17 137.6 148.24 136.15 150.04 136.11 149.92 135.09 151.09 133.62 151.21 131.78 150.63 130.22 151.33 127.72 150.39 126.81 149.34 122.17 148.1 120.81 148.1 115.48 148.1 112.39 146.39 111.75 145.69 112.31 143.13 110.37 137.86 110.5 137.11 111.35 136.23 111.35 135.79 110.18 133.67 109.59 132.66 110.84 128.51 110.84 127.11 108.65 126.27 108.63 126.27 109.29 125.71 109.47 124.48 108.45 121.95 107.83 120.49 106.13 116.97 105.56 117.2 93.49 101.96 91.96");
    			add_location(polygon38, file$2, 0, 19354, 19354);
    			attr_dev(polygon39, "class", "cls-5");
    			attr_dev(polygon39, "points", "102.31 89.18 72.47 85.33 67.02 119.7 71.15 120.47 71.77 117.49 81.09 119.11 81.23 117.83 99.72 119.62 101.96 91.96 102.31 89.18");
    			add_location(polygon39, file$2, 0, 20500, 20500);
    			attr_dev(polygon40, "class", "cls-4");
    			attr_dev(polygon40, "points", "72.47 85.33 76.4 61.01 99.97 64.07 109.82 65.15 109.35 70.93 107.49 89.43 102.31 89.18 72.47 85.33");
    			add_location(polygon40, file$2, 0, 20661, 20661);
    			attr_dev(polygon41, "class", "cls-3");
    			attr_dev(polygon41, "points", "76.4 61.01 66.78 59.26 68.01 53.53 71.59 38.46 72.06 35.56 102.9 39.83 101.36 52.07 99.97 64.07 76.4 61.01");
    			add_location(polygon41, file$2, 0, 20793, 20793);
    			attr_dev(polygon42, "class", "cls-5");
    			attr_dev(polygon42, "points", "71.59 38.46 69.74 38.46 68.78 37.58 66.31 36.81 63.5 36.81 61.12 35.56 61.12 33.5 59.8 32.39 59.8 28.48 57.69 28.48 57.69 25.48 59.54 24.57 59.6 22.78 58.63 21.96 58.84 20.4 58.1 19.41 58.19 17 56.87 16.32 56.87 15.3 54.85 12.02 56.29 7.06 105.71 15.39 103.6 33.88 102.9 39.83 72.06 35.56 71.59 38.46");
    			add_location(polygon42, file$2, 0, 20933, 20933);
    			attr_dev(polygon43, "class", "cls-8");
    			attr_dev(polygon43, "points", "72.47 85.33 46.73 80.91 45.62 86.01 44.5 84.48 42.92 84.48 41.57 85.33 40.98 88.33 41.57 90.6 40.98 92.24 41.75 95.53 42.57 96.32 40.4 99.5 39.4 99.5 38.17 102.56 39.69 105.39 37.58 105.5 36.65 107.38 55.94 117.92 67.02 119.7 72.47 85.33");
    			add_location(polygon43, file$2, 0, 21267, 21267);
    			attr_dev(polygon44, "class", "cls-7");
    			attr_dev(polygon44, "points", "46.73 80.91 53.77 50.81 68.01 53.53 66.78 59.26 76.4 61.01 72.47 85.33 46.73 80.91");
    			add_location(polygon44, file$2, 0, 21538, 21538);
    			attr_dev(polygon45, "class", "cls-4");
    			attr_dev(polygon45, "points", "53.77 50.81 40.54 47.61 25.77 43.78 20.96 59 20.43 62.32 40.98 92.24 41.57 90.6 40.98 88.33 41.57 85.33 42.92 84.48 44.5 84.48 45.62 86.01 46.73 80.91 53.77 50.81");
    			add_location(polygon45, file$2, 0, 21654, 21654);
    			attr_dev(polygon46, "class", "cls-2");
    			attr_dev(polygon46, "points", "40.54 47.61 43.97 36.19 43.97 35.34 46.73 28.82 48.25 28.08 48.72 27.4 46.73 23.44 52.33 6.04 56.29 7.06 54.85 12.02 56.87 15.3 56.87 16.32 58.19 17 58.1 19.41 58.84 20.4 58.63 21.96 59.6 22.78 59.54 24.57 57.69 25.48 57.69 28.48 59.8 28.48 59.8 32.39 61.12 33.5 61.12 35.56 63.5 36.81 66.31 36.81 68.78 37.58 69.74 38.46 71.59 38.46 68.01 53.53 53.77 50.81 40.54 47.61");
    			add_location(polygon46, file$2, 0, 21850, 21850);
    			attr_dev(polygon47, "class", "cls-4");
    			attr_dev(polygon47, "points", "46.73 23.44 37.86 21.21 35.18 21.59 31.18 21.47 29.86 21.04 27.53 21.04 26.82 20.02 24.93 20.02 21.59 18.32 21.59 16.49 18.73 14.84 16.62 13.81 16.05 10.71 16.97 10.54 17.28 12.67 18.38 12.88 18.78 9.9 17.11 8.8 18.6 6.72 19.09 4.51 17.72 2.55 18.82 0.34 20.93 2.63 25.77 4.12 26.91 6.12 25.73 9.56 26.47 10.24 28.05 6.63 29.07 7.69 29.86 7.06 28.01 4.55 28.93 2.17 28.5 0 52.33 6.04 46.73 23.44");
    			add_location(polygon47, file$2, 0, 22253, 22253);
    			attr_dev(polygon48, "class", "cls-5");
    			attr_dev(polygon48, "points", "6.1 37.83 25.77 43.78 40.54 47.61 43.97 36.19 43.97 35.34 46.73 28.82 48.25 28.08 48.72 27.4 46.73 23.44 37.86 21.21 35.18 21.59 31.18 21.47 29.86 21.04 27.53 21.04 26.82 20.02 24.93 20.02 21.59 18.32 21.59 16.49 18.73 14.84 16.62 13.81 16.18 16.62 13.72 19.72 11.61 24.53 8.88 28.69 7.48 32.35 5.63 31.92 5.06 32.86 6.24 34.26 6.1 37.83");
    			add_location(polygon48, file$2, 0, 22682, 22682);
    			attr_dev(polygon49, "class", "cls-2");
    			attr_dev(polygon49, "points", "6.1 37.83 4.87 38.85 5.51 40.38 4.16 42.48 3.99 44.58 1.76 47.01 2.58 48.94 2.76 52.12 1.88 53.3 2.46 55.01 0 56.42 1.05 57.61 1.99 57.1 4.05 60.39 4.46 61.64 3.11 62.2 3.58 63.96 5.92 64.58 6.45 62.94 11.2 63.34 10.44 64.75 8.5 64.02 7.09 64.36 8.38 68.21 7.5 68.83 6.21 67.64 6.16 65.77 4.81 66.23 4.05 71.67 5.86 72.86 5.16 73.99 7.56 79.26 9.56 81.81 9.56 85.89 8.62 86.86 9.97 88.56 14.19 89.75 19.7 93.94 19 96.15 22.87 96.78 22.57 98.14 24.51 99.72 24.74 101.42 23.45 102.73 24.21 104.48 37.58 105.5 39.69 105.39 38.17 102.56 39.4 99.5 40.4 99.5 42.57 96.32 41.75 95.53 40.98 92.24 20.43 62.32 20.96 59 25.77 43.78 6.1 37.83");
    			add_location(polygon49, file$2, 0, 23053, 23053);
    			attr_dev(g0, "id", "Layer_1-2");
    			attr_dev(g0, "data-name", "Layer 1");
    			add_location(g0, file$2, 0, 315, 315);
    			attr_dev(g1, "id", "Layer_2");
    			attr_dev(g1, "data-name", "Layer 2");
    			add_location(g1, file$2, 0, 279, 279);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 270 160");
    			add_location(svg, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, defs);
    			append_dev(defs, style);
    			append_dev(style, t0);
    			append_dev(svg, title);
    			append_dev(title, t1);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			append_dev(g0, path);
    			append_dev(g0, polygon0);
    			append_dev(g0, polygon1);
    			append_dev(g0, polygon2);
    			append_dev(g0, polygon3);
    			append_dev(g0, polygon4);
    			append_dev(g0, polygon5);
    			append_dev(g0, polygon6);
    			append_dev(g0, polygon7);
    			append_dev(g0, polygon8);
    			append_dev(g0, polygon9);
    			append_dev(g0, polygon10);
    			append_dev(g0, polygon11);
    			append_dev(g0, polygon12);
    			append_dev(g0, polygon13);
    			append_dev(g0, polygon14);
    			append_dev(g0, polygon15);
    			append_dev(g0, polygon16);
    			append_dev(g0, polygon17);
    			append_dev(g0, polygon18);
    			append_dev(g0, polygon19);
    			append_dev(g0, polygon20);
    			append_dev(g0, polygon21);
    			append_dev(g0, polygon22);
    			append_dev(g0, polygon23);
    			append_dev(g0, polygon24);
    			append_dev(g0, polygon25);
    			append_dev(g0, polygon26);
    			append_dev(g0, polygon27);
    			append_dev(g0, polygon28);
    			append_dev(g0, polygon29);
    			append_dev(g0, polygon30);
    			append_dev(g0, polygon31);
    			append_dev(g0, polygon32);
    			append_dev(g0, polygon33);
    			append_dev(g0, polygon34);
    			append_dev(g0, polygon35);
    			append_dev(g0, polygon36);
    			append_dev(g0, polygon37);
    			append_dev(g0, polygon38);
    			append_dev(g0, polygon39);
    			append_dev(g0, polygon40);
    			append_dev(g0, polygon41);
    			append_dev(g0, polygon42);
    			append_dev(g0, polygon43);
    			append_dev(g0, polygon44);
    			append_dev(g0, polygon45);
    			append_dev(g0, polygon46);
    			append_dev(g0, polygon47);
    			append_dev(g0, polygon48);
    			append_dev(g0, polygon49);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Choroplethu20_u20main', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Choroplethu20_u20main> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Choroplethu20_u20main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Choroplethu20_u20main",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* Tao-Charts-To-Be-Moved/card-template/card.svelte generated by Svelte v3.46.4 */
    const file$1 = "Tao-Charts-To-Be-Moved/card-template/card.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let h1;
    	let b;
    	let t1;
    	let section;
    	let choropleth;
    	let current;
    	choropleth = new Choroplethu20_u20main({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			b = element("b");
    			b.textContent = "Choropleth";
    			t1 = space();
    			section = element("section");
    			create_component(choropleth.$$.fragment);
    			add_location(b, file$1, 5, 23, 146);
    			attr_dev(h1, "class", "cardTitle svelte-15ihzzw");
    			add_location(h1, file$1, 5, 1, 124);
    			attr_dev(section, "class", "cardSvg svelte-15ihzzw");
    			add_location(section, file$1, 6, 2, 171);
    			attr_dev(div, "class", "card-container svelte-15ihzzw");
    			add_location(div, file$1, 4, 0, 94);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, b);
    			append_dev(div, t1);
    			append_dev(div, section);
    			mount_component(choropleth, section, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(choropleth.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(choropleth.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(choropleth);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Card', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Choropleth: Choroplethu20_u20main });
    	return [];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.4 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let body;
    	let div;
    	let card;
    	let current;
    	card = new Card({ $$inline: true });

    	const block = {
    		c: function create() {
    			body = element("body");
    			div = element("div");
    			create_component(card.$$.fragment);
    			add_location(div, file, 24, 2, 1240);
    			attr_dev(body, "class", "svelte-1nszbcz");
    			add_location(body, file, 23, 0, 1231);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			append_dev(body, div);
    			mount_component(card, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
    			destroy_component(card);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Card });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      // props: {
      //   name: "world",
      // },
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
