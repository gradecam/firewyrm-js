/* globals jasmine, beforeEach, afterEach, describe, it, expect, module, inject, angular */
'use strict';
var fw = require('../src/firewyrm');
var MockWyrmHole = require('../src/mockWyrmHole');
//var ConsoleWyrmHole = require('../src/consoleWyrmHole');

describe("firewyrm", function() {
    describe("creating the queenling", function() {
        var mockWyrmHole, queenling, mimetype = 'application/x-bigwyrm', createArgs;
        beforeEach(function() {
            createArgs = {};
            mockWyrmHole = new MockWyrmHole();
            queenling = fw.create(mockWyrmHole, mimetype, createArgs);
        });
        it("should return a thennable", function() {
            expect(queenling).toBeThennable();
        });
        it("should immediately send the mimetype and params over the WyrmHole", function() {
            expect(mockWyrmHole.lastMessage.args).toEqual(['New', mimetype, createArgs]);
        });
        it("should send 'Enum' message with the provided spawnId after 'New' returns", function() {
            mockWyrmHole.lastMessage.respond('success', mockWyrmHole.spawnId);
            expect(mockWyrmHole.lastMessage.args).toEqual('Enum', mockWyrmHole.spawnId, 0);
        });
        it("should ultimately resolve the queenling", function(done) {
            queenling.then(function() {
                expect(true).toBe(true);
                done();
            }, function() {
                expect(false).toBe(true);
                done();
            });
        });
    });
});
