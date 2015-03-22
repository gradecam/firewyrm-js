/**
 * Provides a slightly-decorated FBPromise
 */
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['../node_modules/fbpromise/FireBreathPromise'], function(fbpromise) {
    var Deferred = fbpromise.FireBreathPromise;

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
