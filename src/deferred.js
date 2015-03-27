/* global toString */
/**
 * Provides a slightly-decorated FBPromise
 */
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['../node_modules/fbpromise/FireBreathPromise'], function(fbpromise) {
    var Deferred = fbpromise.FireBreathPromise;

    Deferred.when = function(val) {
        var dfd = Deferred();
        dfd.resolve(val);
        return dfd.promise;
    };

    Deferred.reject = function(error) {
        var dfd = Deferred();
        dfd.reject(error);
        return dfd.promise;
    };

    /**
     * Recursively turns an array (or object) of promises into a promise for an array or object.
     * If any of the promises gets rejected, the whole thing is rejected immediately.
     * If something other than an object or array is provided, it is returned untouched.
     *
     * @param promises {Array|Object} an array|object (or promise for an array|object)
     *   of values (or promises for values)
     * @returns {promise} a promise for an array of the corresponding values
     */
    // Inspired by Q, concept by Mark Miller
    // http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
    Deferred.all = function(promises) {
        return Deferred.when(promises).then(function(promises) {
            if (!(isArray(promises) || isObject(promises))) { return promises; }
            var resolved = isArray(promises) ? [] : {};
            var pendingCount = 0;
            var dfd = Deferred();
            for (var prop in promises) {
                if (promises.hasOwnProperty(prop)) {
                    resolved[prop] = (void 0); // just to try preserving order of insertion
                    pendingCount++;
                    Deferred.all(promises[prop]).then(thenFn(prop), failFn);
                }
            }

            function thenFn(prop) {
                return function(val) {
                    pendingCount--;
                    resolved[prop] = val;
                    resolveIfDone();
                };
            }
            function failFn(error) { dfd.reject(error); }
            function resolveIfDone() {
                if (pendingCount === 0) {
                    dfd.resolve(resolved);
                }
            }
            resolveIfDone();
            return dfd.promise;
        });
    };

    function isArray(val) {
        return Array.isArray ? Array.isArray(val) : toString.call(val) === '[object Array]';
    }
    function isObject(val) {
        // match plain objects, not special things like ArrayBuffer
        return val && toString.call(val) === '[object Object]';
    }

    // Converts a function that takes a callback as the last argument to a function that returns a
    // deferred object that is resolved to the callback value.
    Deferred.fn = function(obj, method) {
        return function() {
            var args = Array.prototype.slice.call(arguments, 0);
            var dfd = Deferred();
            var callback = function(status, resp) {
                if (status === 'success') { dfd.resolve(resp); }
                else { dfd.reject(resp); }
            };
            args.push(callback);
            obj[method].apply(obj, args);
            return dfd.promise;
        };
    };

    return Deferred;
});
