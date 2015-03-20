/* globals jasmine, beforeEach */
var _ = require('underscore');

beforeEach(function() {
    jasmine.addMatchers(deferredMatchers);
});

// NOTE: to use any of these except `toBeThennable`, you must be using
//       jasmine's mock clock and clockHelpers.addFlushMethod()
var deferredMatchers = {
    toBeThennable: matcherFactory(function(util, customEqualityTesters, actual) {
        return {
            pass: _.isObject(actual) && _.isFunction(actual.then)
        };
    }),
    toBeSettled: matcherFactory(function(util, customEqualityTesters, actual) {
        var ret = {},
            dfd = getPromise(actual);
        dfd.then(passIfResolved(ret), passIfRejected(ret));
        jasmine.clock().flush();
        return ret;
    }),
    toBeResolved: matcherFactory(function(util, customEqualityTesters, actual) {
        var ret = {message: "Expected promise to be resolved but it never settled."},
            dfd = getPromise(actual);
        dfd.then(passIfResolved(ret), failIfRejected(ret));
        jasmine.clock().flush();
        return ret;
    }),
    toBeResolvedWith: matcherFactory(function(util, customEqualityTesters, actual, expected) {
        var ret = {message: "Expected promise to be resolved with " + expected + " but it never settled."},
            dfd = getPromise(actual);
        dfd.then(passIfResolved(ret, expected), failIfRejected(ret, expected));
        jasmine.clock().flush();
        return ret;
    }),
    toBeRejected: matcherFactory(function(util, customEqualityTesters, actual) {
        var ret = {message: "Expected promise to be rejected but it never settled."},
            dfd = getPromise(actual);
        dfd.then(failIfResolved(ret), passIfRejected(ret));
        jasmine.clock().flush();
        return ret;
    }),
    toBeRejectedWith: matcherFactory(function(util, customEqualityTesters, actual, expected) {
        var ret = {message: "Expected promise to be rejected with " + expected + " but it never settled."},
            dfd = getPromise(actual);
        dfd.then(failIfResolved(ret, expected), passIfRejected(ret, expected));
        jasmine.clock().flush();
        return ret;
    }),
};


var passIfResolved = _.partial(passIfCalled, 'resolved');
var failIfResolved = _.partial(failIfCalled, 'resolved');
var passIfRejected = _.partial(passIfCalled, 'rejected');
var failIfRejected = _.partial(failIfCalled, 'rejected');


function getPromise(thing) { return thing.promise ? thing.promise : thing; }
function passIfCalled(thisType, ret, expected){
    var addExpectedVal = arguments.length === 3;
    return function(actual) {
        ret.pass = true;
        if (addExpectedVal && !_.isEqual(actual, expected)) {
            ret.pass = false;
            ret.message = "Expected promise to be " + thisType + " with " + expected + " but it was " + thisType + " with " + actual + ".";
        }
    };
}
function failIfCalled(thisType, ret, expected) {
    var otherType = thisType === 'resolved' ? 'rejected' : 'resolved';
    var addExpectedVal = arguments.length === 3;
    return function(actual) {
        ret.pass = false;
        var expectedMsg = otherType;
        var actualMsg = thisType;
        if (addExpectedVal) {
            expectedMsg += ' with ' + expected;
            actualMsg += ' with ' + actual;
        }
        ret.message = "Expected promise to be " + expectedMsg + " but it was " + actualMsg + ".";
    };
}


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
