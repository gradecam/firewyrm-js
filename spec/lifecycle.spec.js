/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var fw = require('../src/firewyrm');
var clock = require('./helpers/clock');
var lifecycle = require('./helpers/lifecycle');

describe("basic lifecycle", function() {
    var mockWyrmHole, queenling, createArgs, enumProps,
        mimetype = 'application/x-bigwyrm';

    beforeEach(function() {
        clock.install();

        createArgs = {};
        enumProps = ['intProp', 'stringProp', 'arrayProp', 'functionProp'];
        mockWyrmHole = lifecycle.newMockWyrmHole();
        queenling = fw.create(mockWyrmHole, mimetype, createArgs);
    });
    afterEach(function() {
        clock.uninstall();
    });

    describe("creating the queenling", function() {
        it("should return a thennable", function() {
            expect(queenling).toBeThennable();
        });
        it("should immediately send the mimetype and params over the WyrmHole", function() {
            expect(mockWyrmHole.lastOutbound.args).toEqual(['New', mimetype, createArgs]);
        });
        it("should send 'Enum' message with the provided spawnId after 'New' returns", function() {
            mockWyrmHole.lastOutbound.respond('success', mockWyrmHole.lastSpawnId);
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Enum', mockWyrmHole.lastSpawnId, 0]);
        });
        it("should ultimately resolve the queenling", function() {
            mockWyrmHole.lastOutbound.respond('success', mockWyrmHole.lastSpawnId); // respond to "New"
            mockWyrmHole.lastOutbound.respond('success', enumProps); // respond to "Enum"
            expect(queenling).toBeResolved();
        });
    });

    describe("after the queenling is resolved", function() {
        beforeEach(function() {
            queenling = lifecycle.getResolvedQueenling(mockWyrmHole);
        });
        it("should make note of its spawnId and objectId", function() {
            expect(queenling.spawnId).toBe(mockWyrmHole.lastSpawnId);
            expect(queenling.objectId).toBe(0);
        });
        it("should be callable", function() {
            expect(queenling).toEqual(jasmine.any(Function));
        });
        it("should send 'Invoke' if called", function() {
            queenling(1,2);
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', queenling.spawnId, queenling.objectId, '', [1,2]]);
        });
    });

    describe("destroying the queenling", function() {
        beforeEach(function() {
            queenling = lifecycle.getResolvedQueenling(mockWyrmHole);
        });
        it("should send Destroy over the WyrmHole", function() {
            queenling.destroy();
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Destroy', mockWyrmHole.lastSpawnId]);
        });
    });

});
