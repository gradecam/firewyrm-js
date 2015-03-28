/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var FireWyrmJS = require('../src/firewyrm');
var lifecycle = require('./helpers/lifecycle');

describe("browser object", function() {
    var mockWyrmhole, queenling, browserSpawnId, propSpawnId, propObjectId,
        prop = defaults.newQueenlingProps[2]; // complexProp

    beforeEach(function() {
        clock.install();

        mockWyrmhole = lifecycle.newMockWyrmhole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmhole);
        mockWyrmhole.triggerInbound(['New', 'browser', {}]);
        browserSpawnId = mockWyrmhole.lastInbound.response;
    });
    afterEach(function() {
        clock.uninstall();
    });
    function setLocalWyrmling(obj) {
        // so it gets saved off locally
        queenling[prop] = obj;
        clock.flush();
        propSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
        propObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
    }

    it("should have a 'browser' type registered", function() {
        expect(mockWyrmhole.lastInbound.status).toBe('success');
    });

    describe("eval", function() {
        it("should be able to eval JavaScript", function() {
            jasmine.getGlobal().wyrmtest = false;
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'eval', ['jasmine.getGlobal().wyrmtest = true;']]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(jasmine.getGlobal().wyrmtest).toBe(true);
            delete jasmine.getGlobal().wyrmtest;
        });
        it("should return the result", function() {
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'eval', ['(6*7)']]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toBe(42);
        });
        it("should return error if eval failed", function() {
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'eval', ['jasmine.global().wyrmtest = true;']]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'exception thrown', message: jasmine.any(String) });
        });
    });
});
