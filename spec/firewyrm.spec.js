/* globals jasmine, beforeEach, afterEach, describe, it, expect, module, inject, angular */
'use strict';
var fw = require('../src/firewyrm');

// Unit tests for fastRepeat directive. Note that these tests should always pass for both
// fast-repeat and ng-repeat, as they should be compatible.
describe("firewyrm", function() {
    it("should do blah!", function() {
        fw.blah();

        //var consoleWormHole = new fw.ConsoleWormHole();
        //var x = new WyrmJSAPI(0, ['blahFunc'], ['blah'], 'TestAPI', consoleWormHole);
        //x.blahFunc();
        //console.log("x.toString()", x.toString());
    });
});
