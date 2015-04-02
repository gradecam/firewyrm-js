/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var FireWyrmJS = require('../src/firewyrm');
var lifecycle = require('./helpers/lifecycle');

describe("sending objects across the Wyrmhole", function() {
    var mockWyrmhole, queenling,
        prop = defaults.newQueenlingProps[2]; // complexProp

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

    describe("retaining objects that have been sent across the Wyrmhole", function() {
        var complexArray, objSpawnId, objObjectId;
        beforeEach(function() {
            complexArray = [
                42,
                { isObj: true },
                function noop() {}
            ];
            queenling.setProperty(prop, complexArray);
            clock.flush(); // handle prepOutboundValue
            objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
            objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
            mockWyrmhole.lastOutbound.success(null); // mimic success and finish processing any callbacks
        });

        it("should honor a 'RelObj' message", function() {
            mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toBe(null);
        });
        it("should fail accessors like 'RelObj' after it has been released", function() {
            mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);

            // fail GetP
            mockWyrmhole.lastInbound = {};
            mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, '0']);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist'});

            // fail RelObj
            mockWyrmhole.lastInbound = {};
            mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist'});
        });

        describe("if the other end returned an error when we sent the object", function() {
            beforeEach(function() {
                queenling.setProperty('propertyThatDoesNotExist', [5,10,15]);
                clock.flush();
                objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
                objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
                mockWyrmhole.lastOutbound.error('could not set property', 'Property is read-only'); // mimic failure
            });
            it("should still be retained (and answer accessors) until we get RelObj", function() {
                mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
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

    describe("scripting objects that have been sent by reference", function() {
        var objSpawnId, objObjectId;
        describe("arrays", function() {
            beforeEach(function() {
                queenling.setProperty(prop, [9,8,function() { return 42; }]);
                clock.flush();
                objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
                objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
                mockWyrmhole.lastOutbound.success(null); // mimic success and finish processing any callbacks
            });
            it("'Enum' should return each index and the length", function() {
                mockWyrmhole.triggerInbound(['Enum', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(['0','1','2','length']);
            });
            it("'GetP' should return the value", function() {
                mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, '0']);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(9);
            });
            it("'DelP' should return null", function() {
                mockWyrmhole.triggerInbound(['DelP', objSpawnId, objObjectId, '0']);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(null);
            });
            it("'SetP' should return null", function() {
                mockWyrmhole.triggerInbound(['SetP', objSpawnId, objObjectId, '0', 24]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(null);
            });
            it("'RelObj' should succeed", function() {
                mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(null);
            });
            it("'Invoke' should fail", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, '', []]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not invoke object', message: 'Object is not callable' });
            });
            it("'Invoke' should fail for non-function properties", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, '0', []]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not invoke property', message: 'Property is not callable' });
            });
            it("'Invoke' should succeed for function properties", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, '2', []]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(42);
            });
        });

        describe("objects", function() {
            beforeEach(function() {
                var obj = { isObj: true, strVal: 'string', fn: function() { return 42; }, _private: true};
                Object.defineProperty(obj, 'cannotDelete', { value: 666 });
                Object.defineProperty(obj, 'cannotWrite', { value: 666, writable: false });
                queenling.setProperty(prop, obj);
                clock.flush();
                objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
                objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
                mockWyrmhole.lastOutbound.success(null); // mimic success and finish processing any callbacks
            });
            it("'Enum' should return each enumerable property EXCEPT those starting with an underscore", function() {
                mockWyrmhole.triggerInbound(['Enum', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(['isObj', 'strVal', 'fn']);
            });
            it("'GetP' should return the value", function() {
                mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, 'strVal']);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual('string');
            });
            it("'DelP' should return null", function() {
                mockWyrmhole.triggerInbound(['DelP', objSpawnId, objObjectId, 'isObj']);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(null);
            });
            it("'DelP' should fail for non-configurable properties", function() {
                mockWyrmhole.triggerInbound(['DelP', objSpawnId, objObjectId, 'cannotDelete']);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not delete property', message: jasmine.any(String) });
            });
            it("'SetP' should return null", function() {
                mockWyrmhole.triggerInbound(['SetP', objSpawnId, objObjectId, 'isObj', 24]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(null);
            });
            it("'SetP' should fail for non-writable properties", function() {
                mockWyrmhole.triggerInbound(['SetP', objSpawnId, objObjectId, 'cannotWrite', 5]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not set property', message: jasmine.any(String) });
            });
            it("'RelObj' should succeed", function() {
                mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(null);
            });
            it("'Invoke' should fail", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, '', []]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not invoke object', message: 'Object is not callable' });
            });
            it("'Invoke' should fail for non-function properties", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, 'isObj', []]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not invoke property', message: 'Property is not callable' });
            });
            it("'Invoke' should succeed for function properties", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, 'fn', []]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(42);
            });
        });

        describe("functions", function() {
            var args;
            beforeEach(function() {
                args = (void 0);
                queenling.setProperty(prop, function add(a,b,c) {
                    args = Array.prototype.slice.call(arguments, 0);
                    return 0 + a + b + c;
                });
                clock.flush();
                objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
                objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
                mockWyrmhole.lastOutbound.success(null); // mimic success and finish processing any callbacks
            });
            it("'Enum' should return length", function() {
                mockWyrmhole.triggerInbound(['Enum', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(['length']);
            });
            it("'GetP' length should return the number of arguments supported", function() {
                mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, 'length']);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(3);
            });
            it("'GetP' on other properties should fail", function() {
                mockWyrmhole.triggerInbound(['GetP', objSpawnId, objObjectId, 'otherProperty']);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not get property', message: 'Property does not exist on this object' });
            });
            it("'DelP' should fail", function() {
                mockWyrmhole.triggerInbound(['DelP', objSpawnId, objObjectId, 'isObj']);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not delete property', message: 'Property does not exist on this object' });
            });
            it("'SetP' should fail", function() {
                mockWyrmhole.triggerInbound(['SetP', objSpawnId, objObjectId, 'isObj', 24]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not set property', message: 'Property does not exist on this object' });
            });
            it("'RelObj' should succeed", function() {
                mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(null);
            });
            it("'Invoke' should succeed", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, '', [1,2,3]]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(6);
            });
            it("'Invoke' should get arguments after they've been processed", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, '', [
                    { $type: 'binary', data: 'Mg==' },
                    { $type: 'ref', data: [1, 9] },
                    4
                ]]);
                // respond to Enum
                mockWyrmhole.lastOutbound.success([]);
                expect(args).toEqual([jasmine.any(ArrayBuffer), jasmine.any(Function), 4]);
            });
            it("'Invoke' should fail for non-function properties", function() {
                mockWyrmhole.triggerInbound(['Invoke', objSpawnId, objObjectId, 'isObj', []]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not invoke property', message: 'Property does not exist on this object' });
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
});
