if (typeof define !== 'function') { var define = require('amdefine')(module); }
(function(globalScope) {
    define(['./tools'], function(tools) {
        return function(params) {
            params = params || {};
            var browser = {};
            Object.defineProperties(browser, {
                'eval': { value: evalFn, enumerable: true },
                getDocument: { value: getDocument, enumerable: true },
                getWindow: { value: getWindow, enumerable: true },
                invokeWithDelay: { value: invokeWithDelay, enumerable: true },
                readArray: { value: readArray, enumerable: true },
                readObject: { value: readObject, enumerable: true },
            });
            return browser;


            function evalFn(str) {
                try {
                    return eval(str); // jshint ignore:line
                } catch(error) {
                    var ret = { $type: 'error', data: { error: 'exception thrown', message: error && error.message }};
                    if (error.stack) { ret.stack = error.stack; }
                    return ret;
                }
            }

            function invokeWithDelay(delay, fn, args, context) {
                context = context || null;
                if (!(tools.isNumber(delay) && tools.isFunction(fn) && tools.isArray(args))) {
                    return { $type: 'error', data: { error: 'invalid parameters', message: 'Must provide at least delay (Number), fn (Function), and args (Array)'}};
                }

                var releaseWyrmlings = tools.retainAllWyrmlings(args);
                setTimeout(function() {
                    fn.apply(context, args);
                    releaseWyrmlings();
                }, delay);

                return null;
            }

            function getDocument() { return globalScope.document; }

            function getWindow() { return globalScope.window; }

            function readArray(arr) {
                if (!arr) {
                    return { $type: 'error', data: { error: 'invalid object', message: 'The object does not exist' }};
                }
                if (!tools.isArray(arr)) {
                    return { $type: 'error', data: { error: 'invalid object', message: 'Object is not an array' }};
                }
                // special type that will send the object as value, but any of its top-level
                // items are subject to being sent as references -- no nesting
                return { $type: 'one-level', data: arr };
            }

            function readObject(obj) {
                if (!obj) {
                    return { $type: 'error', data: { error: 'invalid object', message: 'The object does not exist' }};
                }
                if (!tools.isObject(obj)) {
                    return { $type: 'error', data: { error: 'invalid object', message: 'Object is not a plain object' }};
                }
                // special type that will send the object as value, but any of its top-level
                // items are subject to being sent as references -- no nesting
                return { $type: 'one-level', data: obj };
            }
        };
    });
}(typeof(global) !== 'undefined' ? global : this));
