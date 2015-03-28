if (typeof define !== 'function') { var define = require('amdefine')(module); }
(function(globalScope) {
    define(['./tools'], function(tools) {
        return function(params) {
            params = params || {};
            var browser = {};
            Object.defineProperties(browser, {
                'eval': { value: evalFn, writable: true },
                getDocument: { value: getDocument, writable: true },
                getWindow: { value: getWindow, writable: true },
                readArray: { value: readArray, writable: true },
                readObject: { value: readObject, writable: true },
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
