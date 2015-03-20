/* globals jasmine */
var _ = require('underscore');
module.exports = {
    addFlushMethod: function() {
        // add's `jasmine.clock().flush()` which will continually tick the clock
        // until there are no pending operations
        var pending = [];
        var _setTimeout = jasmine.clock().setTimeout;

        jasmine.getGlobal().setTimeout = function(fn, delay, context) {
            var wrappedFn = function() {
                pending = _.without(pending, wrappedFn);
                fn();
            };
            pending.push(wrappedFn);
            _setTimeout(wrappedFn, delay, context);
        };
        jasmine.clock().flush = function() {
            while (pending.length) {
                jasmine.clock().tick(1);
            }
        };
    }
};
