/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var FireWyrmJS = require('../src/firewyrm');
var clock = require('./helpers/clock');
var lifecycle = require('./helpers/lifecycle');

describe("basic lifecycle", function() {
    var fw, mockWyrmhole, queenling, createArgs, enumProps,
        mimetype = 'application/x-bigwyrm';

    beforeEach(function() {
        clock.install();

        mockWyrmhole = lifecycle.newMockWyrmhole();
        fw = new FireWyrmJS(mockWyrmhole);
        createArgs = {};
        enumProps = ['intProp', 'stringProp', 'complexProp', 'functionProp'];
        queenling = fw.create(mimetype, createArgs);
    });
    afterEach(function() {
        clock.uninstall();
    });

    describe("creating the queenling", function() {
        it("should return a thennable", function() {
            expect(queenling).toBeThennable();
        });
        it("should immediately send the mimetype and params over the Wyrmhole", function() {
            expect(mockWyrmhole.lastOutbound.args).toEqual(['New', mimetype, createArgs]);
        });
        it("should send 'Enum' message with the provided spawnId after 'New' returns", function() {
            mockWyrmhole.lastOutbound.respond('success', mockWyrmhole.lastSpawnId);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', mockWyrmhole.lastSpawnId, 0]);
        });
        it("should ultimately resolve the queenling", function() {
            mockWyrmhole.lastOutbound.respond('success', mockWyrmhole.lastSpawnId); // respond to "New"
            mockWyrmhole.lastOutbound.respond('success', enumProps); // respond to "Enum"
            expect(queenling).toBeResolved();
        });
    });

    describe("after the queenling is resolved", function() {
        beforeEach(function() {
            queenling = lifecycle.getResolvedQueenling(mockWyrmhole);
        });
        it("should make note of its spawnId and objectId", function() {
            expect(queenling.spawnId).toBe(mockWyrmhole.lastSpawnId);
            expect(queenling.objectId).toBe(0);
        });
        it("should be callable", function() {
            expect(queenling).toEqual(jasmine.any(Function));
        });
        it("should send 'Invoke' if called", function() {
            queenling(1,2);
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', queenling.spawnId, queenling.objectId, '', [1,2]]);
        });
    });

    describe("destroying the queenling", function() {
        beforeEach(function() {
            queenling = lifecycle.getResolvedQueenling(mockWyrmhole);
        });
        it("should send Destroy over the Wyrmhole", function() {
            queenling.destroy();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Destroy', mockWyrmhole.lastSpawnId]);
        });
    });

});
