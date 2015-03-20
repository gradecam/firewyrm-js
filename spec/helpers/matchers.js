/* globals jasmine, beforeEach */
var _ = require('underscore');

beforeEach(function() {
    jasmine.addMatchers(deferredMatchers);
});

var deferredMatchers = {
    toBeThennable: matcherFactory(function(util, customEqualityTesters, actual) {
        return {
            pass: _.isObject(actual) && _.isFunction(actual.then)
        };
    }),
};


// Defining matchers in Jasmine2 is *way* more verbose than Jasmine1,
// and I want it to be short again. So this factory makes most of the
// pain go away and leaves you able to take advantage of the cleaner
// return format of Jasmine2 custom matchers without making your brain
// (or screen) explode from all the boilerplate.
function matcherFactory(compareFn) {
    return function(util, customEqualityTesters) {
        return {
            compare: function() { // order is: actual, expectedN0, expectedN1, expectedN2, etc.
                var args = [util, customEqualityTesters].concat(Array.prototype.slice.call(arguments));
                return compareFn.apply(null, args);
            }
        };
    };
}
