/* globals jasmine, beforeEach, afterEach, describe, it, expect, module, inject, angular */
'use strict';
var fw = require('../src/firewyrm');

// Unit tests for fastRepeat directive. Note that these tests should always pass for both
// fast-repeat and ng-repeat, as they should be compatible.
describe("firewyrm", function() {
    describe("WyrmJSAPI", function() {
        it("should define a function  when passed in the fnList argument", function() {
            var consoleWyrmHole = new fw.ConsoleWyrmHole();
            var x = new fw.WyrmJSAPI(0, ['blahFunc'], ['blah'], 'TestAPI', consoleWyrmHole);
            x.blahFunc();
        });
    });
});
