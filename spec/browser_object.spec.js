/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var FireWyrmJS = require('../src/firewyrm');
var lifecycle = require('./helpers/lifecycle');

describe("browser object", function() {
    var mockWyrmhole, queenling, browserSpawnId, propSpawnId, propObjectId,
        fakeWindow, fakeDocument,
        prop = defaults.newQueenlingProps[2]; // complexProp

    beforeEach(function() {
        clock.install();
        var global = jasmine.getGlobal();
        if (!global.window) {
            global.window = fakeWindow = { fakeWindow: true };
        }
        if (!global.document) {
            global.document = fakeDocument = { fakeDocument: true };
        }


        mockWyrmhole = lifecycle.newMockWyrmhole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmhole);
        mockWyrmhole.triggerInbound(['New', 'browser', {}]);
        browserSpawnId = mockWyrmhole.lastInbound.response;
    });
    afterEach(function() {
        clock.uninstall();
        if (fakeWindow) {
            delete jasmine.getGlobal().window;
            fakeWindow = (void 0);
        }
        if (fakeDocument) {
            delete jasmine.getGlobal().document;
            fakeDocument = (void 0);
        }
    });
    function setLocalWyrmling(obj) {
        // so it gets saved off locally
        queenling[prop] = obj;
        clock.flush();
        propSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
        propObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
    }
    function getPropFromWyrmling(ref, prop) {
        mockWyrmhole.triggerInbound(['GetP', ref.data[0], ref.data[1], prop]);
        return mockWyrmhole.lastInbound.response;
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

    describe("getDocument", function() {
        it("should return a reference to global.document", function() {
            jasmine.getGlobal().document.wyrmtest = true;
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'getDocument', []]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toEqual({ $type: 'ref', data: [jasmine.any(Number), jasmine.any(Number)] });
            expect(getPropFromWyrmling(mockWyrmhole.lastInbound.response, 'wyrmtest')).toBe(true);
            delete jasmine.getGlobal().document.wyrmtest;
        });
    });

    describe("getWindow", function() {
        it("should return a reference to global.window", function() {
            jasmine.getGlobal().window.wyrmtest = 'wyrmtest';
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'getWindow', []]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toEqual({ $type: 'ref', data: [jasmine.any(Number), jasmine.any(Number)] });
            expect(getPropFromWyrmling(mockWyrmhole.lastInbound.response, 'wyrmtest')).toBe('wyrmtest');
            delete jasmine.getGlobal().window.wyrmtest;
        });
    });
});
