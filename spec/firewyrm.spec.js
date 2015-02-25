/* globals jasmine, beforeEach, afterEach, describe, it, expect, module, inject, angular */
'use strict';
var fw = require('../src/firewyrm');
var ConsoleWyrmHole = require('../src/consoleWyrmHole');
var MockWyrmHole = require('../src/mockWyrmHole');

// Unit tests for fastRepeat directive. Note that these tests should always pass for both
// fast-repeat and ng-repeat, as they should be compatible.
describe("firewyrm", function() {
    describe("WyrmJSAPI", function() {
        it("should define a function when passed in the fnList argument", function() {
            var consoleWyrmHole = new ConsoleWyrmHole();
            var x = new fw.WyrmJSAPI(0, ['blahFunc'], [], 'TestAPI', consoleWyrmHole);
            x.blahFunc();
        });

        it("should create a properly formed CallFn message", function() {
            var mockWyrmHole = new MockWyrmHole();
            var x = new fw.WyrmJSAPI(0, ['blahFunc'], [], 'TestAPI', mockWyrmHole);
            x.blahFunc();
            expect(mockWyrmHole.lastMessage.message).toBe('CallFn');
        });

    });

});
