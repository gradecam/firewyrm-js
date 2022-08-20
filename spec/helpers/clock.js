/* globals jasmine */
var _ = require('underscore');
module.exports = {
    install: install,
    flush: noop,
    uninstall: uninstall,
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};


var installed = false;
function install() {
    if (installed) { return; }
    installed = true;
    jasmine.clock().install();

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
    module.exports.flush = function() {
        while (pending.length) {
            jasmine.clock().tick(1);
        }
    };
}
function uninstall() {
    if (!installed) { return; }
    installed = false;
    jasmine.clock().uninstall();
    module.exports.flush = noop;
}
function noop(){}
