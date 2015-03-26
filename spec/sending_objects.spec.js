/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var FireWyrmJS = require('../src/firewyrm');
var lifecycle = require('./helpers/lifecycle');

describe("sending objects across the Wyrmhole", function() {
    var mockWyrmhole, queenling,
        prop = defaults.newQueenlingProps[2]; // arrayProp

    beforeEach(function() {
        clock.install();

        mockWyrmhole = lifecycle.newMockWyrmhole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmhole);
    });
    afterEach(function() {
        clock.uninstall();
    });

    it("should pass objects by reference", function() {
        queenling.setProperty(prop, { isObj: true });
        clock.flush();
        expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, {
            $type: 'ref',
            data: [jasmine.any(Number), jasmine.any(Number)] // spawnId, objectId
        }]);
    });
    it("should use 0 for spawnId and increment the objectId for each sent object", function() {
        queenling.setProperty(prop, { isObj: true });
        clock.flush();
        var firstSpawnId = mockWyrmhole.lastOutbound.args[4].data[0],
            firstObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
        expect(firstSpawnId).toBe(0);

        // send another message so we can verify objectId was incremented
        queenling.setProperty(prop, { isDifferentObj: true });
        clock.flush();
        var nextSpawnId = mockWyrmhole.lastOutbound.args[4].data[0],
            nextObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
        expect(nextSpawnId).toBe(0);
        expect(nextObjectId).toBeGreaterThan(firstObjectId);
    });

    describe("retaining objects that have been successfully sent across the Wyrmhole", function() {
        var complexArray, objSpawnId, objObjectId;
        beforeEach(function() {
            complexArray = [
                42,
                { isObj: true },
                function noop() {}
            ];
            queenling.setProperty(prop, complexArray);
            clock.flush();
            objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
            objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
            mockWyrmhole.lastOutbound.success(null); // mimic success and finish processing any callbacks
        });
        it("should respond to 'Enum' requests for the sent object", function() {
            mockWyrmhole.triggerInbound(['Enum', objSpawnId, objObjectId]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toEqual(['0','1','2','length']);
        });
        it("should respond to 'GetP' requests for the sent object", function() {
            mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, '0']);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toEqual(42);
        });
        it("should respond to 'SetP' requests for the sent object", function() {
            mockWyrmhole.triggerInbound(['SetP', objSpawnId, objObjectId, '0', 24]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toBe(null);
        });
        it("should respond to 'RelObj' requests for the sent object", function() {
            mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toBe(null);
        });

        describe("after the object has been released", function() {
            beforeEach(function() {
                mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
            });
            it("should repond with errors if further operations are attempted", function() {
                mockWyrmhole.triggerInbound(['Enum', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist'});
                mockWyrmhole.lastInbound = {};
                mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, '0']);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist'});
            });
        });

        describe("if a nested complex object is requested", function() {
            var nestedSpawnId, nestedObjectId;
            beforeEach(function() {
                mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, '1']); // this is { isObj: true }
                // This is kind of bad because it assumes the first test (below) will be valid.
                // As a result, if the first test is bad then it will actually blow up here
                // before even getting into the spec.
                nestedSpawnId = mockWyrmhole.lastInbound.response.data[0];
                nestedObjectId = mockWyrmhole.lastInbound.response.data[1];
            });
            it("should be sent by reference, too", function() {
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual({
                    $type: 'ref',
                    data: [jasmine.any(Number), jasmine.any(Number)] // spawnId, objectId
                });
                expect(nestedSpawnId).toBe(0);
                expect(nestedObjectId).toBeGreaterThan(objObjectId);
            });
            it("should also be able to respond to accessor operations", function() {
                mockWyrmhole.triggerInbound(['GetP', nestedSpawnId, nestedObjectId, 'isObj']);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(true);
            });

            describe("releasing the parent object", function() {
                beforeEach(function() {
                    mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
                });
                it("should still be retaining the nested object and able to respond to accessor operations", function() {
                    mockWyrmhole.triggerInbound(['GetP', nestedSpawnId, nestedObjectId, 'isObj']);
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toBe(true);
                });
            });
        });
    });

    describe("sending objects by value", function() {
        var complexArray;
        beforeEach(function() {
            complexArray = [42, { isObj: true }, { complexObject: { hasNested: { properties: true } } } ];
        });
        it("should return a special value when asVal is called", function() {
            var complexValue = FireWyrmJS.asVal(complexArray);
            expect(complexValue).toEqual({$type: 'json', data: complexArray});
        });
        it("should preserve the special value when used with SetP", function() {
            var complexValue = FireWyrmJS.asVal(complexArray);
            queenling.setProperty(prop, complexValue);
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, complexValue]);
        });
        it("should send primitives plainly even if asVal is called", function() {
            expect(FireWyrmJS.asVal(1)).toBe(1);
            queenling.setProperty(prop, FireWyrmJS.asVal(1));
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, 1]);

            expect(FireWyrmJS.asVal('string')).toBe('string');
            queenling.setProperty(prop, FireWyrmJS.asVal('string'));
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, 'string']);
            expect(FireWyrmJS.asVal(false)).toBe(false);
            queenling.setProperty(prop, FireWyrmJS.asVal(false));
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, false]);
            expect(FireWyrmJS.asVal(null)).toBe(null);
            queenling.setProperty(prop, FireWyrmJS.asVal(null));
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, null]);
        });
    });

    /******************************************************************
     * Error sending the object across the Wyrmhole
     ******************************************************************/
    describe("NOT retaining objects that failed to be sent across the Wyrmhole", function() {
        var objSpawnId, objObjectId;
        beforeEach(function() {
            queenling.setProperty('propertyThatDoesNotExist', [5,10,15]);
            clock.flush();
            objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
            objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
            mockWyrmhole.lastOutbound.error('could not set property', 'Property is read-only'); // mimic failure
        });
        it("should repond with errors if accessor operations are attempted", function() {
            mockWyrmhole.triggerInbound(['Enum', objSpawnId, objObjectId]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist'});
            mockWyrmhole.lastInbound = {};
            mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, '0']);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist'});
        });
    });
});
