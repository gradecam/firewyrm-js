/* globals jasmine, beforeEach, afterEach, describe, it, expect, module, inject, angular */
'use strict';
var fw = require('../src/firewyrm');
var ConsoleWyrmHole = require('../src/consoleWyrmHole');
var MockWyrmHole = require('../src/mockWyrmHole');

describe("firewyrm", function() {
    describe("WyrmJSAPI messages", function() {
        it("should define a function when passed in the fnList argument", function() {
            var consoleWyrmHole = new ConsoleWyrmHole();
            var x = new fw.WyrmJSAPI(0, ['blahFunc'], [], 'TestAPI', consoleWyrmHole);
            x.blahFunc();
        });

        var mockWyrmHole = new MockWyrmHole();

        it("should create a properly formed Invoke message", function() {
            var x = new fw.WyrmJSAPI(1, ['blahFunc'], [], 'TestAPI', mockWyrmHole);
            x.blahFunc();
            console.log(JSON.stringify(mockWyrmHole.lastMessage.args));
            expect(mockWyrmHole.lastMessage.args).toEqual(['Invoke', 1, 'blahFunc', []]);
        });

        it("set property should be well formed.", function() {
            var myObj = new fw.WyrmJSAPI(1, [], ['x'], 'TestAPI', mockWyrmHole);
            myObj.x = 1;
            console.log(JSON.stringify(mockWyrmHole.lastMessage.args));
            expect(mockWyrmHole.lastMessage.args).toEqual(['SetP', 1, 'x', 1]);
        });

        it("get property should be well formed.", function() {
            var myObj = new fw.WyrmJSAPI(1, [], ['x'], 'TestAPI', mockWyrmHole);
            var myVal = myObj.x;
            console.log(JSON.stringify(mockWyrmHole.lastMessage.args));
            expect(mockWyrmHole.lastMessage.args).toEqual(['GetP', 1, 'x']);
        });

    });

    describe("getRootObject", function() {
        it("should create a properly formed DescribeObj message", function() {
            var mockWyrmHole = new MockWyrmHole();
            fw.getRootObject(mockWyrmHole);
            expect(mockWyrmHole.lastMessage.args).toEqual([ 'DescribeObj', 0 ]);
        });
    });


});
