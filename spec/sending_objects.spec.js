/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var lifecycle = require('./helpers/lifecycle');

describe("sending objects across the WyrmHole", function() {
    var mockWyrmHole, queenling,
        prop = defaults.newQueenlingProps[2]; // arrayProp

    beforeEach(function() {
        clock.install();

        mockWyrmHole = lifecycle.newMockWyrmHole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmHole);
    });
    afterEach(function() {
        clock.uninstall();
    });

    it("should pass objects by reference", function() {
        queenling.setProperty(prop, { isObj: true });
        expect(mockWyrmHole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, {
            $type: 'ref',
            data: [jasmine.any(Number), jasmine.any(Number)] // spawnId, objectId
        }]);
    });
    it("should use 0 for spawnId and increment the objectId for each sent object", function() {
        queenling.setProperty(prop, { isObj: true });
        var firstSpawnId = mockWyrmHole.lastOutbound.args[4][0],
            firstObjectId = mockWyrmHole.lastOutbound.args[4][1];
        expect(firstSpawnId).toBe(0);

        // send another message so we can verify objectId was incremented
        queenling.setProperty(prop, { isDifferentObj: true });
        var nextSpawnId = mockWyrmHole.lastOutbound.args[4][0],
            nextObjectId = mockWyrmHole.lastOutbound.args[4][1];
        expect(nextSpawnId).toBe(0);
        expect(nextObjectId).toBeGreaterThan(firstObjectId);
    });

    describe("retaining objects that have been successfully sent across the WyrmHole", function() {
        var complexArray, objSpawnId, objObjectId;
        beforeEach(function() {
            complexArray = [
                42,
                { isObj: true },
                function noop() {}
            ];
            queenling.setProperty(prop, complexArray);
            objSpawnId = mockWyrmHole.lastOutbound.args[4][0];
            objObjectId = mockWyrmHole.lastOutbound.args[4][1];
            mockWyrmHole.lastOutbound.success(null); // mimic success and finish processing any callbacks
        });
        it("should respond to 'Enum' requests for the sent object", function() {
            mockWyrmHole.triggerInbound(['Enum', objSpawnId, objObjectId]);
            expect(mockWyrmHole.lastInbound.status).toBe('success');
            expect(mockWyrmHole.lastInbound.data).toEqual(['0','1','2','length']);
        });
        it("should respond to 'GetP' requests for the sent object", function() {
            mockWyrmHole.triggerInbound(['GetP', objSpawnId, objObjectId, '0']);
            expect(mockWyrmHole.lastInbound.status).toBe('success');
            expect(mockWyrmHole.lastInbound.data).toEqual(42);
        });
        it("should respond to 'SetP' requests for the sent object", function() {
            mockWyrmHole.triggerInbound(['SetP', objSpawnId, objObjectId, '0', 24]);
            expect(mockWyrmHole.lastInbound.status).toBe('success');
            expect(mockWyrmHole.lastInbound.data).toBe(null);
        });
        it("should respond to 'RelObj' requests for the sent object", function() {
            mockWyrmHole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
            expect(mockWyrmHole.lastInbound.status).toBe('success');
            expect(mockWyrmHole.lastInbound.data).toBe(null);
        });

        describe("after the object has been released", function() {
            beforeEach(function() {
                mockWyrmHole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
            });
            it("should repond with errors if further operations are attempted", function() {
                mockWyrmHole.triggerInbound(['Enum', objSpawnId, objObjectId]);
                expect(mockWyrmHole.lastInbound.status).toBe('error');
                expect(mockWyrmHole.lastInbound.data).toEqual({ error: 'invalid object', message: 'The object does not exist'});
                mockWyrmHole.lastInbound = {};
                mockWyrmHole.triggerInbound(['GetP', objSpawnId, objObjectId]);
                expect(mockWyrmHole.lastInbound.status).toBe('error');
                expect(mockWyrmHole.lastInbound.data).toEqual({ error: 'invalid object', message: 'The object does not exist'});
            });
        });

        describe("if a nested complex object is requested", function() {
            var nestedSpawnId, nestedObjectId;
            beforeEach(function() {
                mockWyrmHole.triggerInbound(['GetP', objSpawnId, objObjectId, '1']); // this is { isObj: true }
                // This is kind of bad because it assumes the first test (below) will be valid.
                // As a result, if the first test is bad then it will actually blow up here
                // before even getting into the spec.
                nestedSpawnId = mockWyrmHole.lastInbound.response.data[0];
                nestedObjectId = mockWyrmHole.lastInbound.response.data[1];
            });
            it("should be sent by reference, too", function() {
                expect(mockWyrmHole.lastInbound.status).toBe('success');
                expect(mockWyrmHole.lastInbound.response).toEqual({
                    $type: 'ref',
                    data: [jasmine.any(Number), jasmine.any(Number)] // spawnId, objectId
                });
                expect(nestedSpawnId).toBe(0);
                expect(nestedObjectId).toBeGreaterThan(objObjectId);
            });
            it("should also be able to respond to accessor operations", function() {
                mockWyrmHole.triggerInbound('GetP', nestedSpawnId, nestedObjectId, 'isObj');
                expect(mockWyrmHole.lastInbound.status).toBe('success');
                expect(mockWyrmHole.lastInbound.response).toBe(true);
            });

            describe("releasing the parent object", function() {
                beforeEach(function() {
                    mockWyrmHole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
                });
                it("should still be retaining the nested object and able to respond to accessor operations", function() {
                    mockWyrmHole.triggerInbound('GetP', nestedSpawnId, nestedObjectId, 'isObj');
                    expect(mockWyrmHole.lastInbound.status).toBe('success');
                    expect(mockWyrmHole.lastInbound.response).toBe(true);
                });
            });
        });
    });

    /******************************************************************
     * Error sending the object across the WyrmHole
     ******************************************************************/
    describe("NOT retaining objects that failed to be sent across the WyrmHole", function() {
        var objSpawnId, objObjectId;
        beforeEach(function() {
            queenling.setProperty(prop, [5,10,15]);
            objSpawnId = mockWyrmHole.lastOutbound.args[4][0];
            objObjectId = mockWyrmHole.lastOutbound.args[4][1];
            mockWyrmHole.lastOutbound.error('could not set property', 'Property is read-only'); // mimic failure
        });
        it("should repond with errors if accessor operations are attempted", function() {
            mockWyrmHole.triggerInbound(['Enum', objSpawnId, objObjectId]);
            expect(mockWyrmHole.lastInbound.status).toBe('error');
            expect(mockWyrmHole.lastInbound.data).toEqual({ error: 'invalid object', message: 'The object does not exist'});
            mockWyrmHole.lastInbound = {};
            mockWyrmHole.triggerInbound(['GetP', objSpawnId, objObjectId]);
            expect(mockWyrmHole.lastInbound.status).toBe('error');
            expect(mockWyrmHole.lastInbound.data).toEqual({ error: 'invalid object', message: 'The object does not exist'});
        });
    });
});
