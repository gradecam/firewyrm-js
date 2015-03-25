/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var fw = require('../src/firewyrm');
var lifecycle = require('./helpers/lifecycle');

describe("invoking functions across the WyrmHole", function() {
    var mockWyrmHole, queenling,
        prop = defaults.newQueenlingProps[3]; // functionProp

    beforeEach(function() {
        clock.install();

        mockWyrmHole = lifecycle.newMockWyrmHole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmHole);
    });
    afterEach(function() {
        clock.uninstall();
    });

    describe("queenling.getProperty and getters", function() {
        it("should return a special, callable promise", function() {
            var getDfd = queenling.getProperty(prop);
            expect(getDfd).toBeThennable();
            expect(getDfd).toEqual(jasmine.any(Function));

            getDfd = queenling[prop];
            expect(getDfd).toBeThennable();
            expect(getDfd).toEqual(jasmine.any(Function));
        });
        it("should invoke GetP", function() {
            var getDfd = queenling.getProperty(prop);
            expect(mockWyrmHole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            mockWyrmHole.lastOutbound = {};
            getDfd = queenling[prop];
            expect(mockWyrmHole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
        });

        describe("special, callable promises", function() {
            it("should call 'Invoke' using the spawnId / objectId returned from GetP and an empty property name", function() {
                queenling[prop](6,7);
                var fnSpawnId = Math.floor(Math.random()*100);
                var fnObjectId = Math.floor(Math.random()*100);
                mockWyrmHole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]}); // mock success and resolve any promises
                expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', jasmine.any(Array)]);
            });
            it("should return promises when invoked", function() {
                var invokeDfd = queenling.getProperty(prop)(6,7);
                expect(invokeDfd).toBeThennable();

                invokeDfd = queenling[prop](6,7);
                expect(invokeDfd).toBeThennable();
            });
            it("should ultimately resolve the promise with the return value", function() {
                var invokeDfd = queenling[prop](6,7);
                var fnSpawnId = Math.floor(Math.random()*100);
                var fnObjectId = Math.floor(Math.random()*100);
                mockWyrmHole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]}); // mock success and resolve any promises
                mockWyrmHole.lastOutbound.success(false);
                expect(invokeDfd).toBeResolvedWith(false);
            });
            it("should resolve string values, too", function() {
                var invokeDfd = queenling[prop](6,7);
                var fnSpawnId = Math.floor(Math.random()*100);
                var fnObjectId = Math.floor(Math.random()*100);
                mockWyrmHole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]}); // mock success and resolve any promises
                mockWyrmHole.lastOutbound.success('I am a string');
                expect(invokeDfd).toBeResolvedWith('I am a string');
            });
        });
    });

    describe("sending arguments", function() {
        var fnSpawnId, fnObjectId;
        function invokeWithArguments() {
            queenling[prop].apply(queenling, arguments);
            // respond to GetP and resolve any resulting promises
            fnSpawnId = Math.floor(Math.random()*100);
            fnObjectId = Math.floor(Math.random()*100);
            mockWyrmHole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]});
        }
        it("should properly pass zero arguments", function() {
            invokeWithArguments();
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', []]);
        });
        it("should properly pass one argument", function() {
            invokeWithArguments(false);
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', [false]]);
        });
        it("should properly pass multiple arguments", function() {
            invokeWithArguments('string', 3.6, null, true);
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', ['string', 3.6, null, true]]);
        });

        describe("passing complex arguments to a function", function() {
            it("should default to pass as ref", function() {
                invokeWithArguments(3, { isObj: true }, true);
                expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', [
                    3,
                    { $type: 'ref', data: [jasmine.any(Number), jasmine.any(Number)] },
                    true
                ]]);
            });
            it("should pass as val if requested", function() {
                invokeWithArguments(3, fw.asVal({ isObj: true }), true);
                clock.flush();
                expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', [
                    3,
                    { $type: 'json', data: { isObj: true } },
                    true
                ]]);
            });
        });
    });

    describe("queenling.invoke", function() {
        it("should send 'Invoke' without first sending 'GetP'", function() {
            queenling.invoke(prop);
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', queenling.spawnId, queenling.objectId, prop, []]);
        });
        it("should accept n arguments and pass them along", function() {
            queenling.invoke(prop, null, 'string', { isObj: true });
            expect(mockWyrmHole.lastOutbound.args).toEqual(['Invoke', queenling.spawnId, queenling.objectId, prop, [
                null,
                'string',
                { $type: 'ref', data: [jasmine.any(Number), jasmine.any(Number)] }
            ]]);
        });
        it("should return a promise", function() {
            var invokeDfd = queenling.invoke(prop, 6, 7);
            expect(invokeDfd).toBeThennable();
        });
        it("should ultimately resolve to the return value", function() {
            var invokeDfd = queenling.invoke(prop, 6, 7);
            mockWyrmHole.lastOutbound.success(42);
            expect(invokeDfd).toBeResolvedWith(42);
        });
    });


    /******************************************************************
     * Error cases
     ******************************************************************/
    describe("trying to invoke a primitive property", function() {
        it("should reject without even sending the 'Invoke' message", function() {
            var invokeDfd = queenling.intProp();
            mockWyrmHole.lastOutbound.success(42);
            expect(mockWyrmHole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, 'intProp']);
            expect(invokeDfd).toHaveBeenRejectedWith({
                error: 'could not invoke',
                message: 'The object is not invokable'
            });
        });
    });
});
