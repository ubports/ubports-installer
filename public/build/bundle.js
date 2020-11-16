
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {function(): Promise<SvelteComponent>} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {Object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {Object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {Object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.29.0 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (209:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(209:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (202:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(202:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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

    function wrap$1(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn("Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading");

    	return wrap({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    	try {
    		window.history.replaceState(undefined, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event("hashchange"));
    }

    function link(node, hrefVar) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, hrefVar || node.getAttribute("href"));

    	return {
    		update(updated) {
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, href) {
    	// Destination must start with '/'
    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute: " + href);
    	}

    	// Add # to the href attribute
    	node.setAttribute("href", "#" + href);

    	node.addEventListener("click", scrollstateHistoryHandler);
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {HTMLElementEventMap} event - an onclick event attached to an anchor tag
     */
    function scrollstateHistoryHandler(event) {
    	// Prevent default anchor onclick behaviour
    	event.preventDefault();

    	const href = event.currentTarget.getAttribute("href");

    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			scrollX: window.scrollX,
    			scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix) {
    				if (typeof prefix == "string" && path.startsWith(prefix)) {
    					path = path.substr(prefix.length) || "/";
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || "/";
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || "") || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {Object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	if (restoreScrollState) {
    		window.addEventListener("popstate", event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		});

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.scrollX, previousScrollState.scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick("conditionsFailed", detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoading", Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == "object" && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoaded", Object.assign({}, detail, { component, name: component.name }));

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    	});

    	const writable_props = ["routes", "prefix", "restoreScrollState"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble($$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		tick,
    		_wrap: wrap,
    		wrap: wrap$1,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		scrollstateHistoryHandler,
    		createEventDispatcher,
    		afterUpdate,
    		regexparam,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		lastLoc,
    		componentObj
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("previousScrollState" in $$props) previousScrollState = $$props.previousScrollState;
    		if ("lastLoc" in $$props) lastLoc = $$props.lastLoc;
    		if ("componentObj" in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			 history.scrollRestoration = restoreScrollState ? "manual" : "auto";
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ui/views/Done.svelte generated by Svelte v3.29.0 */

    const file = "src/ui/views/Done.svelte";

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h4;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t5;
    	let a0;
    	let t7;
    	let t8;
    	let p2;
    	let t9;
    	let a1;
    	let t11;
    	let button0;
    	let t13;
    	let button1;
    	let t15;
    	let p3;
    	let t16;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Success!";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "The installation process from the computer is done. The device will now perform the remaining steps which should take less than five minutes. After the installation, the device will reboot and you can begin to explore Ubuntu Touch.";
    			t4 = space();
    			p1 = element("p");
    			t5 = text("Found something you don't like?  ");
    			a0 = element("a");
    			a0.textContent = "Tell us";
    			t7 = text(", or help us change it!");
    			t8 = space();
    			p2 = element("p");
    			t9 = text("Development of Ubuntu Touch is driven by the ");
    			a1 = element("a");
    			a1.textContent = "UBports Community";
    			t11 = text(". Donate now to allow us to continue our mission!\n            ");
    			button0 = element("button");
    			button0.textContent = "Get involved";
    			t13 = space();
    			button1 = element("button");
    			button1.textContent = "Donate";
    			t15 = space();
    			p3 = element("p");
    			t16 = text("Got more devices you want to flash?\n            ");
    			button2 = element("button");
    			button2.textContent = "Flash another device!";
    			if (img.src !== (img_src_value = "../screens/Screen6.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Screen6");
    			set_style(img, "height", "350px");
    			set_style(img, "margin", "auto");
    			set_style(img, "display", "block");
    			add_location(img, file, 6, 8, 129);
    			attr_dev(div0, "class", "col-xs-6");
    			add_location(div0, file, 5, 4, 98);
    			set_style(h4, "font-weight", "bold");
    			add_location(h4, file, 9, 8, 277);
    			add_location(p0, file, 10, 8, 330);
    			attr_dev(a0, "href", "");
    			add_location(a0, file, 11, 44, 613);
    			add_location(p1, file, 11, 8, 577);
    			attr_dev(a1, "href", "");
    			add_location(a1, file, 13, 57, 824);
    			attr_dev(button0, "class", "btn btn-default");
    			set_style(button0, "width", "49%");
    			set_style(button0, "margin-bottom", "10px");
    			set_style(button0, "margin-right", "5px");
    			add_location(button0, file, 14, 12, 988);
    			attr_dev(button1, "class", "btn btn-primary");
    			set_style(button1, "width", "49%");
    			set_style(button1, "margin-bottom", "10px");
    			add_location(button1, file, 15, 12, 1196);
    			add_location(p2, file, 12, 8, 763);
    			attr_dev(button2, "class", "btn btn-info");
    			set_style(button2, "width", "100%");
    			add_location(button2, file, 19, 12, 1451);
    			add_location(p3, file, 17, 8, 1387);
    			attr_dev(div1, "class", "col-xs-6");
    			add_location(div1, file, 8, 4, 246);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file, 4, 0, 76);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h4);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(p1, t5);
    			append_dev(p1, a0);
    			append_dev(p1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, p2);
    			append_dev(p2, t9);
    			append_dev(p2, a1);
    			append_dev(p2, t11);
    			append_dev(p2, button0);
    			append_dev(p2, t13);
    			append_dev(p2, button1);
    			append_dev(div1, t15);
    			append_dev(div1, p3);
    			append_dev(p3, t16);
    			append_dev(p3, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", prevent_default(/*click_handler*/ ctx[2]), false, true, false),
    					listen_dev(a1, "click", prevent_default(/*click_handler_1*/ ctx[3]), false, true, false),
    					listen_dev(button0, "click", prevent_default(/*click_handler_2*/ ctx[4]), false, true, false),
    					listen_dev(button1, "click", prevent_default(/*click_handler_3*/ ctx[5]), false, true, false),
    					listen_dev(button2, "click", prevent_default(/*click_handler_4*/ ctx[6]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots("Done", slots, []);
    	const { ipcRenderer, shell } = require("electron");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Done> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => shell.openExternal("https://github.com/ubports/ubports-touch");
    	const click_handler_1 = () => shell.openExternal("https://ubports.com");
    	const click_handler_2 = () => shell.openExternal("https://ubports.com/join-us");
    	const click_handler_3 = () => shell.openExternal("https://ubports.com/donate");
    	const click_handler_4 = () => ipcRenderer.send("restart");
    	$$self.$capture_state = () => ({ ipcRenderer, shell });

    	return [
    		ipcRenderer,
    		shell,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Done extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Done",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/ui/views/NotSupported.svelte generated by Svelte v3.29.0 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/ui/views/NotSupported.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h40;
    	let t2;
    	let p0;
    	let t3;
    	let span;
    	let t4;
    	let p1;
    	let b;
    	let t6;
    	let t7;
    	let p2;
    	let t8;
    	let a0;
    	let t10;
    	let t11;
    	let hr;
    	let t12;
    	let h41;
    	let t14;
    	let p3;
    	let t15;
    	let a1;
    	let t17;
    	let t18;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Device not supported";
    			t2 = space();
    			p0 = element("p");
    			t3 = text("Your device:\n            ");
    			span = element("span");
    			t4 = space();
    			p1 = element("p");
    			b = element("b");
    			b.textContent = "Sorry";
    			t6 = text("\n            , there is no port for this device yet!");
    			t7 = space();
    			p2 = element("p");
    			t8 = text("See\n            ");
    			a0 = element("a");
    			a0.textContent = "devices.ubuntu-touch.io";
    			t10 = text("\n            for more info");
    			t11 = space();
    			hr = element("hr");
    			t12 = space();
    			h41 = element("h4");
    			h41.textContent = "You want to try to install anyway?";
    			t14 = space();
    			p3 = element("p");
    			t15 = text("You can try selecting your device manually, but please only do so if you're sure that your exact model is actually supported! You might also want to ");
    			a1 = element("a");
    			a1.textContent = "file a bug";
    			t17 = text(".");
    			t18 = space();
    			button = element("button");
    			button.textContent = "Select device manually";
    			if (img.src !== (img_src_value = "../screens/Screen5.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Screen5");
    			set_style(img, "height", "350px");
    			set_style(img, "margin", "auto");
    			set_style(img, "display", "block");
    			add_location(img, file$1, 6, 8, 112);
    			attr_dev(div0, "class", "col-xs-6");
    			add_location(div0, file$1, 5, 4, 81);
    			set_style(h40, "font-weight", "bold");
    			add_location(h40, file$1, 9, 8, 260);
    			attr_dev(span, "id", "your-device");
    			add_location(span, file$1, 12, 12, 366);
    			add_location(p0, file$1, 10, 8, 325);
    			add_location(b, file$1, 15, 12, 434);
    			add_location(p1, file$1, 14, 8, 418);
    			attr_dev(a0, "href", "");
    			add_location(a0, file$1, 20, 12, 552);
    			add_location(p2, file$1, 18, 8, 520);
    			add_location(hr, file$1, 23, 8, 720);
    			set_style(h41, "font-weight", "bold");
    			add_location(h41, file$1, 24, 8, 733);
    			attr_dev(a1, "href", "");
    			add_location(a1, file$1, 26, 161, 977);
    			add_location(p3, file$1, 25, 8, 812);
    			attr_dev(button, "class", "btn btn-default");
    			set_style(button, "width", "100%");
    			add_location(button, file$1, 28, 8, 1107);
    			attr_dev(div1, "class", "col-xs-6");
    			add_location(div1, file$1, 8, 4, 229);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$1, 4, 0, 59);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h40);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(p0, t3);
    			append_dev(p0, span);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(p1, b);
    			append_dev(p1, t6);
    			append_dev(div1, t7);
    			append_dev(div1, p2);
    			append_dev(p2, t8);
    			append_dev(p2, a0);
    			append_dev(p2, t10);
    			append_dev(div1, t11);
    			append_dev(div1, hr);
    			append_dev(div1, t12);
    			append_dev(div1, h41);
    			append_dev(div1, t14);
    			append_dev(div1, p3);
    			append_dev(p3, t15);
    			append_dev(p3, a1);
    			append_dev(p3, t17);
    			append_dev(div1, t18);
    			append_dev(div1, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", prevent_default(/*click_handler*/ ctx[1]), false, true, false),
    					listen_dev(a1, "click", prevent_default(/*click_handler_1*/ ctx[2]), false, true, false),
    					listen_dev(button, "click", prevent_default(/*click_handler_2*/ ctx[3]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NotSupported", slots, []);
    	const { shell } = require("electron");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<NotSupported> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => shell.openExternal("http://devices.ubuntu-touch.io");
    	const click_handler_1 = () => shell.openExternal("http://devices.ubuntu-touch.io");
    	const click_handler_2 = () => console.log("Open device select modal");
    	$$self.$capture_state = () => ({ shell });
    	return [shell, click_handler, click_handler_1, click_handler_2];
    }

    class NotSupported extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotSupported",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/ui/views/SelectOs.svelte generated by Svelte v3.29.0 */

    const file$2 = "src/ui/views/SelectOs.svelte";

    function create_fragment$3(ctx) {
    	let div5;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div4;
    	let h4;
    	let t2;
    	let p0;
    	let a0;
    	let a1;
    	let t5;
    	let p1;
    	let t7;
    	let form;
    	let div3;
    	let div1;
    	let label;
    	let t9;
    	let div2;
    	let select;
    	let t10;
    	let button;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div4 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Device";
    			t2 = space();
    			p0 = element("p");
    			a0 = element("a");
    			a0.textContent = "about this device";
    			a1 = element("a");
    			a1.textContent = "view config file";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "What operating system do you want to install?";
    			t7 = space();
    			form = element("form");
    			div3 = element("div");
    			div1 = element("div");
    			label = element("label");
    			label.textContent = "OS";
    			t9 = space();
    			div2 = element("div");
    			select = element("select");
    			t10 = space();
    			button = element("button");
    			button.textContent = "Install";
    			if (img.src !== (img_src_value = "../screens/Screen6.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Screen6");
    			set_style(img, "height", "350px");
    			set_style(img, "margin", "auto");
    			set_style(img, "display", "block");
    			add_location(img, file$2, 6, 8, 74);
    			attr_dev(div0, "class", "col-xs-6");
    			add_location(div0, file$2, 5, 4, 43);
    			set_style(h4, "font-weight", "bold");
    			add_location(h4, file$2, 9, 8, 243);
    			attr_dev(a0, "href", "");
    			add_location(a0, file$2, 11, 12, 310);
    			attr_dev(a1, "href", "");
    			add_location(a1, file$2, 11, 41, 339);
    			add_location(p0, file$2, 10, 8, 294);
    			add_location(p1, file$2, 13, 8, 389);
    			attr_dev(label, "for", "options-os");
    			attr_dev(label, "class", "control-label");
    			add_location(label, file$2, 19, 20, 599);
    			attr_dev(div1, "class", "col-xs-3");
    			add_location(div1, file$2, 18, 16, 556);
    			attr_dev(select, "id", "options-os");
    			attr_dev(select, "name", "options-os");
    			attr_dev(select, "class", "form-control space");
    			add_location(select, file$2, 22, 20, 738);
    			attr_dev(div2, "class", "col-xs-9");
    			add_location(div2, file$2, 21, 16, 695);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$2, 17, 12, 515);
    			attr_dev(form, "class", "form-horizontal");
    			add_location(form, file$2, 16, 8, 472);
    			attr_dev(button, "class", "btn btn-primary");
    			set_style(button, "width", "100%");
    			set_style(button, "margin-top", "10px");
    			add_location(button, file$2, 28, 8, 905);
    			attr_dev(div4, "class", "col-xs-6");
    			set_style(div4, "height", "100%");
    			add_location(div4, file$2, 8, 4, 191);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$2, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, img);
    			append_dev(div5, t0);
    			append_dev(div5, div4);
    			append_dev(div4, h4);
    			append_dev(div4, t2);
    			append_dev(div4, p0);
    			append_dev(p0, a0);
    			append_dev(p0, a1);
    			append_dev(div4, t5);
    			append_dev(div4, p1);
    			append_dev(div4, t7);
    			append_dev(div4, form);
    			append_dev(form, div3);
    			append_dev(div3, div1);
    			append_dev(div1, label);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, select);
    			append_dev(div4, t10);
    			append_dev(div4, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SelectOs", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SelectOs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class SelectOs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectOs",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/ui/views/UserAction.svelte generated by Svelte v3.29.0 */

    const file$3 = "src/ui/views/UserAction.svelte";

    // (21:8) {#if userActionButton}
    function create_if_block$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Continue";
    			attr_dev(button, "class", "btn btn-primary");
    			set_style(button, "width", "100%");
    			add_location(button, file$3, 21, 8, 496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", prevent_default(/*click_handler*/ ctx[4]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(21:8) {#if userActionButton}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h4;
    	let t2;
    	let p;
    	let t4;
    	let if_block = /*userActionButton*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h4 = element("h4");
    			h4.textContent = `${/*userActionTitle*/ ctx[1]}`;
    			t2 = space();
    			p = element("p");
    			p.textContent = `${/*userActionDescription*/ ctx[2]}`;
    			t4 = space();
    			if (if_block) if_block.c();
    			if (img.src !== (img_src_value = "../screens/Screen6.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Screen6");
    			set_style(img, "height", "350px");
    			set_style(img, "margin", "auto");
    			set_style(img, "display", "block");
    			add_location(img, file$3, 11, 8, 172);
    			attr_dev(div0, "class", "col-xs-6");
    			add_location(div0, file$3, 10, 4, 141);
    			set_style(h4, "font-weight", "bold");
    			add_location(h4, file$3, 14, 8, 320);
    			add_location(p, file$3, 17, 8, 404);
    			attr_dev(div1, "class", "col-xs-6");
    			add_location(div1, file$3, 13, 4, 289);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$3, 9, 0, 119);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h4);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(div1, t4);
    			if (if_block) if_block.m(div1, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*userActionButton*/ ctx[3]) if_block.p(ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("UserAction", slots, []);
    	let event;
    	let userActionTitle;
    	let userActionDescription;
    	let userActionButton;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<UserAction> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => event.sender.send("action:completed");

    	$$self.$capture_state = () => ({
    		event,
    		userActionTitle,
    		userActionDescription,
    		userActionButton
    	});

    	$$self.$inject_state = $$props => {
    		if ("event" in $$props) $$invalidate(0, event = $$props.event);
    		if ("userActionTitle" in $$props) $$invalidate(1, userActionTitle = $$props.userActionTitle);
    		if ("userActionDescription" in $$props) $$invalidate(2, userActionDescription = $$props.userActionDescription);
    		if ("userActionButton" in $$props) $$invalidate(3, userActionButton = $$props.userActionButton);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [event, userActionTitle, userActionDescription, userActionButton, click_handler];
    }

    class UserAction extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UserAction",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/ui/modals/Modal.svelte generated by Svelte v3.29.0 */
    const file$4 = "src/ui/modals/Modal.svelte";
    const get_actions_slot_changes = dirty => ({});
    const get_actions_slot_context = ctx => ({});
    const get_content_slot_changes = dirty => ({});
    const get_content_slot_context = ctx => ({});
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    function create_fragment$5(ctx) {
    	let div0;
    	let t0;
    	let div4;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let button;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;
    	const header_slot_template = /*#slots*/ ctx[2].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[1], get_header_slot_context);
    	const content_slot_template = /*#slots*/ ctx[2].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[1], get_content_slot_context);
    	const actions_slot_template = /*#slots*/ ctx[2].actions;
    	const actions_slot = create_slot(actions_slot_template, ctx, /*$$scope*/ ctx[1], get_actions_slot_context);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div4 = element("div");
    			div1 = element("div");
    			if (header_slot) header_slot.c();
    			t1 = space();
    			div2 = element("div");
    			if (content_slot) content_slot.c();
    			t2 = space();
    			div3 = element("div");
    			button = element("button");
    			button.textContent = "Close";
    			t4 = space();
    			if (actions_slot) actions_slot.c();
    			attr_dev(div0, "class", "svelte-modal-background svelte-duuppv");
    			add_location(div0, file$4, 7, 0, 153);
    			attr_dev(div1, "class", "svelte-modal-header svelte-duuppv");
    			add_location(div1, file$4, 10, 1, 275);
    			attr_dev(div2, "class", "svelte-modal-content svelte-duuppv");
    			add_location(div2, file$4, 13, 1, 348);
    			attr_dev(button, "class", "btn btn-default");
    			add_location(button, file$4, 17, 2, 460);
    			attr_dev(div3, "class", "svelte-modal-actions svelte-duuppv");
    			add_location(div3, file$4, 16, 1, 423);
    			attr_dev(div4, "class", "svelte-modal svelte-duuppv");
    			attr_dev(div4, "role", "dialog");
    			attr_dev(div4, "aria-modal", "true");
    			add_location(div4, file$4, 9, 0, 215);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);

    			if (header_slot) {
    				header_slot.m(div1, null);
    			}

    			append_dev(div4, t1);
    			append_dev(div4, div2);

    			if (content_slot) {
    				content_slot.m(div2, null);
    			}

    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, button);
    			append_dev(div3, t4);

    			if (actions_slot) {
    				actions_slot.m(div3, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*close*/ ctx[0], false, false, false),
    					listen_dev(button, "click", /*close*/ ctx[0], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (header_slot) {
    				if (header_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(header_slot, header_slot_template, ctx, /*$$scope*/ ctx[1], dirty, get_header_slot_changes, get_header_slot_context);
    				}
    			}

    			if (content_slot) {
    				if (content_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(content_slot, content_slot_template, ctx, /*$$scope*/ ctx[1], dirty, get_content_slot_changes, get_content_slot_context);
    				}
    			}

    			if (actions_slot) {
    				if (actions_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(actions_slot, actions_slot_template, ctx, /*$$scope*/ ctx[1], dirty, get_actions_slot_changes, get_actions_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			transition_in(content_slot, local);
    			transition_in(actions_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot, local);
    			transition_out(content_slot, local);
    			transition_out(actions_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (header_slot) header_slot.d(detaching);
    			if (content_slot) content_slot.d(detaching);
    			if (actions_slot) actions_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Modal", slots, ['header','content','actions']);
    	const dispatch = createEventDispatcher();
    	const close = () => dispatch("close");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch, close });
    	return [close, $$scope, slots];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/ui/modals/SelectDeviceModal.svelte generated by Svelte v3.29.0 */

    const { console: console_1$2 } = globals;
    const file$5 = "src/ui/modals/SelectDeviceModal.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (21:4) <h2 slot="header">
    function create_header_slot(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Select your device";
    			attr_dev(h2, "slot", "header");
    			add_location(h2, file$5, 20, 4, 478);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot.name,
    		type: "slot",
    		source: "(21:4) <h2 slot=\\\"header\\\">",
    		ctx
    	});

    	return block;
    }

    // (30:22) {#each selectOptions as selectOption}
    function create_each_block(ctx) {
    	let option;
    	let t0_value = /*selectOption*/ ctx[11].name + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*selectOption*/ ctx[11].value;
    			option.value = option.__value;
    			add_location(option, file$5, 30, 24, 941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectOptions*/ 1 && t0_value !== (t0_value = /*selectOption*/ ctx[11].name + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*selectOptions*/ 1 && option_value_value !== (option_value_value = /*selectOption*/ ctx[11].value)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(30:22) {#each selectOptions as selectOption}",
    		ctx
    	});

    	return block;
    }

    // (24:4) <div slot="content">
    function create_content_slot(ctx) {
    	let div0;
    	let form;
    	let div2;
    	let label;
    	let t1;
    	let div1;
    	let select;
    	let t2;
    	let p0;
    	let t3;
    	let a0;
    	let t5;
    	let a1;
    	let t7;
    	let a2;
    	let t9;
    	let t10;
    	let p1;
    	let t11;
    	let b;
    	let mounted;
    	let dispose;
    	let each_value = /*selectOptions*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			form = element("form");
    			div2 = element("div");
    			label = element("label");
    			label.textContent = "Device";
    			t1 = space();
    			div1 = element("div");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			p0 = element("p");
    			t3 = text("Not all ");
    			a0 = element("a");
    			a0.textContent = "Ubuntu Touch devices";
    			t5 = text(" are supported by the UBports Installer yet.\n            You can find installation instructions for devices not listed here on ");
    			a1 = element("a");
    			a1.textContent = "devices.ubuntu-touch.io";
    			t7 = text(". \n            If you want to help, you can ");
    			a2 = element("a");
    			a2.textContent = "contribute a config file";
    			t9 = text(" for any device and operating system!");
    			t10 = space();
    			p1 = element("p");
    			t11 = text("Please do not try to install other devices images on your device. ");
    			b = element("b");
    			b.textContent = "It will not work!";
    			attr_dev(label, "for", "");
    			attr_dev(label, "class", "col-xs-3 control-label");
    			add_location(label, file$5, 26, 16, 674);
    			attr_dev(select, "class", "form-control space");
    			if (/*selectedDevice*/ ctx[1] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[5].call(select));
    			add_location(select, file$5, 28, 20, 793);
    			attr_dev(div1, "class", "col-xs-9");
    			add_location(div1, file$5, 27, 16, 750);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$5, 25, 13, 633);
    			attr_dev(form, "id", "device-form");
    			attr_dev(form, "class", "form form-horizontal");
    			add_location(form, file$5, 24, 8, 567);
    			attr_dev(a0, "href", "");
    			add_location(a0, file$5, 39, 20, 1208);
    			attr_dev(a1, "href", "");
    			add_location(a1, file$5, 40, 82, 1453);
    			attr_dev(a2, "href", "");
    			add_location(a2, file$5, 41, 41, 1618);
    			add_location(p0, file$5, 38, 8, 1184);
    			add_location(b, file$5, 44, 78, 1929);
    			add_location(p1, file$5, 43, 8, 1847);
    			attr_dev(div0, "slot", "content");
    			add_location(div0, file$5, 23, 4, 538);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, form);
    			append_dev(form, div2);
    			append_dev(div2, label);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*selectedDevice*/ ctx[1]);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(p0, t3);
    			append_dev(p0, a0);
    			append_dev(p0, t5);
    			append_dev(p0, a1);
    			append_dev(p0, t7);
    			append_dev(p0, a2);
    			append_dev(p0, t9);
    			append_dev(div0, t10);
    			append_dev(div0, p1);
    			append_dev(p1, t11);
    			append_dev(p1, b);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[5]),
    					listen_dev(a0, "click", prevent_default(/*click_handler*/ ctx[6]), false, true, false),
    					listen_dev(a1, "click", prevent_default(/*click_handler_1*/ ctx[7]), false, true, false),
    					listen_dev(a2, "click", prevent_default(/*click_handler_2*/ ctx[8]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectOptions*/ 1) {
    				each_value = /*selectOptions*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*selectedDevice, selectOptions*/ 3) {
    				select_option(select, /*selectedDevice*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_content_slot.name,
    		type: "slot",
    		source: "(24:4) <div slot=\\\"content\\\">",
    		ctx
    	});

    	return block;
    }

    // (48:4) <div slot="actions">
    function create_actions_slot(ctx) {
    	let div;
    	let button;
    	let t;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t = text("Select");
    			attr_dev(button, "class", "btn btn-primary");
    			button.disabled = button_disabled_value = !/*selectedDevice*/ ctx[1];
    			add_location(button, file$5, 48, 6, 2009);
    			attr_dev(div, "slot", "actions");
    			add_location(div, file$5, 47, 4, 1982);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*selectDevice*/ ctx[3](/*selectedDevice*/ ctx[1]))) /*selectDevice*/ ctx[3](/*selectedDevice*/ ctx[1]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*selectedDevice, selectOptions*/ 3 && button_disabled_value !== (button_disabled_value = !/*selectedDevice*/ ctx[1])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_actions_slot.name,
    		type: "slot",
    		source: "(48:4) <div slot=\\\"actions\\\">",
    		ctx
    	});

    	return block;
    }

    // (20:0) <Modal on:close={close}>
    function create_default_slot(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = space();
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(20:0) <Modal on:close={close}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: {
    					default: [create_default_slot],
    					actions: [create_actions_slot],
    					content: [create_content_slot],
    					header: [create_header_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modal.$on("close", /*close*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, selectedDevice, selectOptions*/ 16387) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SelectDeviceModal", slots, []);
    	const { shell, ipcRenderer } = require("electron");
    	let { selectOptions } = $$props;
    	let selectedDevice;

    	function selectDevice(device) {
    		console.log(device);
    		ipcRenderer.send("device:selected", device);
    		close();
    	}

    	const dispatch = createEventDispatcher();
    	const close = () => dispatch("close");
    	const writable_props = ["selectOptions"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<SelectDeviceModal> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		selectedDevice = select_value(this);
    		$$invalidate(1, selectedDevice);
    		$$invalidate(0, selectOptions);
    	}

    	const click_handler = () => shell.openExternal("https://devices.ubuntu-touch.io");
    	const click_handler_1 = () => shell.openExternal("https://devices.ubuntu-touch.io");
    	const click_handler_2 = () => shell.openExternal("https://github.com/ubports/installer-configs/blob/master/v1/_device.schema.json");

    	$$self.$$set = $$props => {
    		if ("selectOptions" in $$props) $$invalidate(0, selectOptions = $$props.selectOptions);
    	};

    	$$self.$capture_state = () => ({
    		Modal,
    		shell,
    		ipcRenderer,
    		createEventDispatcher,
    		selectOptions,
    		selectedDevice,
    		selectDevice,
    		dispatch,
    		close
    	});

    	$$self.$inject_state = $$props => {
    		if ("selectOptions" in $$props) $$invalidate(0, selectOptions = $$props.selectOptions);
    		if ("selectedDevice" in $$props) $$invalidate(1, selectedDevice = $$props.selectedDevice);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectOptions,
    		selectedDevice,
    		shell,
    		selectDevice,
    		close,
    		select_change_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class SelectDeviceModal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { selectOptions: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectDeviceModal",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*selectOptions*/ ctx[0] === undefined && !("selectOptions" in props)) {
    			console_1$2.warn("<SelectDeviceModal> was created without expected prop 'selectOptions'");
    		}
    	}

    	get selectOptions() {
    		throw new Error("<SelectDeviceModal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectOptions(value) {
    		throw new Error("<SelectDeviceModal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ui/views/WaitForDevice.svelte generated by Svelte v3.29.0 */

    const { console: console_1$3 } = globals;
    const file$6 = "src/ui/views/WaitForDevice.svelte";

    // (59:0) {#if showDeviceModal}
    function create_if_block$2(ctx) {
    	let selectdevicemodal;
    	let current;

    	selectdevicemodal = new SelectDeviceModal({
    			props: { selectOptions: /*selectOptions*/ ctx[1] },
    			$$inline: true
    		});

    	selectdevicemodal.$on("close", /*closeDeviceModal*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(selectdevicemodal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectdevicemodal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const selectdevicemodal_changes = {};
    			if (dirty & /*selectOptions*/ 2) selectdevicemodal_changes.selectOptions = /*selectOptions*/ ctx[1];
    			selectdevicemodal.$set(selectdevicemodal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectdevicemodal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectdevicemodal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectdevicemodal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(59:0) {#if showDeviceModal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h4;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let button0;
    	let t8;
    	let p2;
    	let t9;
    	let a;
    	let t11;
    	let t12;
    	let button1;
    	let t14;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*showDeviceModal*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Please connect your device";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Welcome to the UBports Installer! This tool will walk you through the Ubuntu Touch installation process. Don't worry, it's easy!";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Connect your device to the computer and enable developer mode. After that, your device should be detected automatically.";
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "How do I enable developer mode?";
    			t8 = space();
    			p2 = element("p");
    			t9 = text("If your device is not detected automatically, you can select it manually to proceed. Please note that the UBports Installer will only work on\n            ");
    			a = element("a");
    			a.textContent = "supported devices";
    			t11 = text(".");
    			t12 = space();
    			button1 = element("button");
    			button1.textContent = "Select device manually";
    			t14 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			if (img.src !== (img_src_value = "./screens/Screen1.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "screen1");
    			set_style(img, "height", "350px");
    			set_style(img, "margin", "auto");
    			add_location(img, file$6, 32, 8, 996);
    			attr_dev(div0, "class", "col-6");
    			add_location(div0, file$6, 31, 4, 968);
    			add_location(h4, file$6, 35, 8, 1124);
    			add_location(p0, file$6, 38, 8, 1190);
    			add_location(p1, file$6, 41, 8, 1356);
    			attr_dev(button0, "id", "btn-modal-dev-mode");
    			attr_dev(button0, "class", "btn btn-primary svelte-1eoe9jy");
    			add_location(button0, file$6, 44, 8, 1514);
    			attr_dev(a, "href", "");
    			add_location(a, file$6, 49, 12, 1811);
    			add_location(p2, file$6, 47, 8, 1641);
    			attr_dev(button1, "id", "btn-modal-select-device");
    			attr_dev(button1, "class", "btn btn-outline-dark svelte-1eoe9jy");
    			add_location(button1, file$6, 52, 8, 1961);
    			attr_dev(div1, "class", "col-6");
    			add_location(div1, file$6, 34, 4, 1096);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$6, 30, 0, 946);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h4);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(div1, t6);
    			append_dev(div1, button0);
    			append_dev(div1, t8);
    			append_dev(div1, p2);
    			append_dev(p2, t9);
    			append_dev(p2, a);
    			append_dev(p2, t11);
    			append_dev(div1, t12);
    			append_dev(div1, button1);
    			insert_dev(target, t14, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "click", prevent_default(/*click_handler*/ ctx[5]), false, true, false),
    					listen_dev(button1, "click", /*openDeviceModal*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showDeviceModal*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showDeviceModal*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t14);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("WaitForDevice", slots, []);
    	const { shell, ipcRenderer } = require("electron");
    	let showDeviceModal = false;
    	let selectOptions;

    	ipcRenderer.on("device:wait:device-selects-ready", (event, deviceSelects) => {
    		//   footer.topText.set("Waiting for device", true);
    		//   footer.underText.set("Please connect your device with a USB cable");
    		//if (!remote.getGlobal("installProperties").device) {
    		$$invalidate(1, selectOptions = deviceSelects);
    	}); //} else {
    	// if the device is set, just return the device:selected event
    	// ipcRenderer.send("device:selected", remote.getGlobal("installProperties").device);
    	//}

    	function openDeviceModal() {
    		$$invalidate(0, showDeviceModal = true);
    		console.log(showDeviceModal);
    	}

    	function closeDeviceModal() {
    		$$invalidate(0, showDeviceModal = false);
    		console.log(showDeviceModal);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<WaitForDevice> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => shell.openExternal("http://devices.ubuntu-touch.io");

    	$$self.$capture_state = () => ({
    		shell,
    		ipcRenderer,
    		SelectDeviceModal,
    		showDeviceModal,
    		selectOptions,
    		openDeviceModal,
    		closeDeviceModal
    	});

    	$$self.$inject_state = $$props => {
    		if ("showDeviceModal" in $$props) $$invalidate(0, showDeviceModal = $$props.showDeviceModal);
    		if ("selectOptions" in $$props) $$invalidate(1, selectOptions = $$props.selectOptions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showDeviceModal,
    		selectOptions,
    		shell,
    		openDeviceModal,
    		closeDeviceModal,
    		click_handler
    	];
    }

    class WaitForDevice extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WaitForDevice",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/ui/views/Working.svelte generated by Svelte v3.29.0 */

    const file$7 = "src/ui/views/Working.svelte";

    function create_fragment$8(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let t1;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t1 = space();
    			img = element("img");
    			attr_dev(div0, "class", "loader-circle");
    			add_location(div0, file$7, 1, 4, 26);
    			attr_dev(div1, "class", "loader-line svelte-1e8tshl");
    			add_location(div1, file$7, 3, 8, 103);
    			attr_dev(div2, "class", "loader-line-mask svelte-1e8tshl");
    			add_location(div2, file$7, 2, 4, 64);
    			attr_dev(div3, "class", "content svelte-1e8tshl");
    			add_location(div3, file$7, 0, 0, 0);
    			if (img.src !== (img_src_value = "./img/yumi.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "yumi");
    			attr_dev(img, "class", "ub-robot");
    			attr_dev(img, "width", "100");
    			add_location(img, file$7, 6, 0, 153);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Working", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Working> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Working extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Working",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.0 */
    const file$8 = "src/App.svelte";

    function create_fragment$9(ctx) {
    	let div4;
    	let div1;
    	let h30;
    	let t2;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let div2;
    	let router;
    	let t7;
    	let footer;
    	let div3;
    	let h31;
    	let span0;
    	let t9;
    	let span1;
    	let t10;
    	let p;
    	let span2;
    	let t12;
    	let span3;
    	let current;
    	let mounted;
    	let dispose;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			h30 = element("h3");
    			h30.textContent = `UBports Installer ${global.packageInfo.version}`;
    			t2 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Report a bug";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "Donate";
    			t6 = space();
    			div2 = element("div");
    			create_component(router.$$.fragment);
    			t7 = space();
    			footer = element("footer");
    			div3 = element("div");
    			h31 = element("h3");
    			span0 = element("span");
    			span0.textContent = "UBports Installer is starting up";
    			t9 = space();
    			span1 = element("span");
    			t10 = space();
    			p = element("p");
    			span2 = element("span");
    			span2.textContent = "Starting adb service";
    			t12 = space();
    			span3 = element("span");
    			attr_dev(h30, "id", "header-text");
    			attr_dev(h30, "class", "text-muted installer");
    			add_location(h30, file$8, 77, 2, 1963);
    			attr_dev(button0, "id", "help");
    			attr_dev(button0, "class", "help-button btn btn-primary svelte-129caqh");
    			add_location(button0, file$8, 81, 3, 2115);
    			attr_dev(button1, "id", "donate");
    			attr_dev(button1, "class", "donate-button btn btn-primary svelte-129caqh");
    			add_location(button1, file$8, 82, 3, 2262);
    			attr_dev(div0, "class", "header-buttons-wrapper svelte-129caqh");
    			add_location(div0, file$8, 80, 2, 2075);
    			attr_dev(div1, "class", "header svelte-129caqh");
    			add_location(div1, file$8, 76, 1, 1940);
    			attr_dev(div2, "class", "view-container container svelte-129caqh");
    			add_location(div2, file$8, 85, 1, 2435);
    			attr_dev(span0, "id", "footer-top");
    			add_location(span0, file$8, 91, 4, 2596);
    			attr_dev(span1, "id", "wait-dot");
    			add_location(span1, file$8, 94, 4, 2674);
    			attr_dev(h31, "class", "text-muted footer-top");
    			add_location(h31, file$8, 90, 3, 2557);
    			attr_dev(span2, "id", "footer-bottom");
    			attr_dev(span2, "class", "text-muted");
    			add_location(span2, file$8, 97, 4, 2722);
    			attr_dev(span3, "id", "footer-speed");
    			attr_dev(span3, "class", "text-muted");
    			add_location(span3, file$8, 100, 4, 2809);
    			add_location(p, file$8, 96, 3, 2714);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$8, 89, 2, 2530);
    			attr_dev(footer, "class", "footer svelte-129caqh");
    			add_location(footer, file$8, 88, 1, 2504);
    			attr_dev(div4, "class", "app-wrapper svelte-129caqh");
    			add_location(div4, file$8, 75, 0, 1913);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, h30);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t4);
    			append_dev(div0, button1);
    			append_dev(div4, t6);
    			append_dev(div4, div2);
    			mount_component(router, div2, null);
    			append_dev(div4, t7);
    			append_dev(div4, footer);
    			append_dev(footer, div3);
    			append_dev(div3, h31);
    			append_dev(h31, span0);
    			append_dev(h31, t9);
    			append_dev(h31, span1);
    			append_dev(div3, t10);
    			append_dev(div3, p);
    			append_dev(p, span2);
    			append_dev(p, t12);
    			append_dev(p, span3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", prevent_default(/*click_handler*/ ctx[3]), false, true, false),
    					listen_dev(button1, "click", prevent_default(/*click_handler_1*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(router);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const { remote, ipcRenderer, shell } = require("electron");
    	global.installProperties = remote.getGlobal("installProperties");
    	global.packageInfo = remote.getGlobal("packageInfo");

    	//Modals
    	let showNewUpdateModal = false;

    	let showUdevModal = false;

    	const routes = {
    		"/": WaitForDevice,
    		"/done": Done,
    		"/not-supported": NotSupported,
    		"/select-os": SelectOs,
    		"/user-action": UserAction,
    		"/working": Working
    	};

    	//Messages	
    	ipcRenderer.on("user:write:working", (e, animation) => {
    		push("/working");
    	});

    	ipcRenderer.on("user:write:done", () => {
    		push("/done");
    	}); //$("#progress").width("0%");

    	ipcRenderer.on("user:update-available", () => {
    		if (global.packageInfo.isSnap) ; //$("#snap-update-instructions").show();
    		//$("#generic-update-instructions").show();

    		showNewUpdateModal = true;
    	});

    	ipcRenderer.on("user:device-unsupported", (event, device) => {
    		//   footer.topText.set("Device not supported");
    		//   footer.underText.set("The device " + device + " is not supported");
    		//   $("[id=your-device]").text(device);
    		push("/not-supported");
    	});

    	ipcRenderer.on("user:action", (event, action) => {
    		push("/user-action");
    	});

    	ipcRenderer.on("user:os", (event, installConfig, osSelects) => {
    		global.installConfig = installConfig;
    		global.installConfig.os_to_install = undefined;
    		push("/select-os");
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => ipcRenderer.send("createBugReport");
    	const click_handler_1 = () => shell.openExternal("https://ubports.com/donate");

    	$$self.$capture_state = () => ({
    		remote,
    		ipcRenderer,
    		shell,
    		showNewUpdateModal,
    		showUdevModal,
    		Router,
    		push,
    		Done,
    		NotSupported,
    		SelectOs,
    		UserAction,
    		WaitForDevice,
    		Working,
    		routes
    	});

    	$$self.$inject_state = $$props => {
    		if ("showNewUpdateModal" in $$props) showNewUpdateModal = $$props.showNewUpdateModal;
    		if ("showUdevModal" in $$props) showUdevModal = $$props.showUdevModal;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ipcRenderer, shell, routes, click_handler, click_handler_1];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
