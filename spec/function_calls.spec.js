/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var FireWyrmJS = require('../dist/firewyrm').default;
var lifecycle = require('./helpers/lifecycle');

describe("invoking functions across the Wyrmhole", function() {
    var mockWyrmhole, queenling,
        prop = defaults.newQueenlingProps[3]; // functionProp

    beforeEach(async function() {
        clock.install();

        mockWyrmhole = lifecycle.newMockWyrmhole();
        queenling = await lifecycle.getResolvedQueenling(mockWyrmhole);
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
            expect(mockWyrmhole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            mockWyrmhole.lastOutbound = {};
            getDfd = queenling[prop];
            expect(mockWyrmhole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
        });

        describe("special, callable promises", function() {
            it("should call 'Invoke' using the spawnId / objectId returned from GetP and an empty property name", function() {
                queenling[prop](6,7);
                var fnSpawnId = Math.floor(Math.random()*100);
                var fnObjectId = Math.floor(Math.random()*100);
                // mock success and resolve any promises
                mockWyrmhole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]});
                // respond to the resulting 'Enum' from when we wrap the alien wyrmling
                mockWyrmhole.lastOutbound.success([]);
                // respond to 'Invoke'
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', jasmine.any(Array)]);
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
                // mock success and resolve any promises
                mockWyrmhole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]});
                // respond to the resulting 'Enum' from when we wrap the alien wyrmling
                mockWyrmhole.lastOutbound.success([]);
                // respond to 'Invoke'
                mockWyrmhole.lastOutbound.success(false);
                expect(invokeDfd).toBeResolvedWith(false);
            });
            it("should resolve string values, too", function() {
                var invokeDfd = queenling[prop](6,7);
                var fnSpawnId = Math.floor(Math.random()*100);
                var fnObjectId = Math.floor(Math.random()*100);
                // mock success and resolve any promises
                mockWyrmhole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]});
                // respond to the resulting 'Enum' from when we wrap the alien wyrmling
                mockWyrmhole.lastOutbound.success([]);
                // respond to 'Invoke'
                mockWyrmhole.lastOutbound.success('I am a string');
                expect(invokeDfd).toBeResolvedWith('I am a string');
            });
        });
    });

    describe("sending arguments", function() {
        var fnSpawnId, fnObjectId;
        function invokeWithArguments() {
            var invokeDfd = queenling[prop].apply(queenling, arguments);
            // respond to GetP and resolve any resulting promises
            fnSpawnId = Math.floor(Math.random()*100);
            fnObjectId = Math.floor(Math.random()*100);
            mockWyrmhole.lastOutbound.success({$type: 'ref', data: [fnSpawnId, fnObjectId]});
            // respond to Enum
            mockWyrmhole.lastOutbound.success([]);
            return invokeDfd;
        }
        it("should properly pass zero arguments", function() {
            invokeWithArguments();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', []]);
        });
        it("should properly pass one argument", function() {
            invokeWithArguments(false);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', [false]]);
        });
        it("should properly pass multiple arguments", function() {
            invokeWithArguments('string', 3.6, null, true);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', ['string', 3.6, null, true]]);
        });
        it("should ultimately resolve with the return value", function() {
            var invokeDfd = invokeWithArguments('string', 3.6, null, true);
            mockWyrmhole.lastOutbound.success('Good job!');
            expect(invokeDfd).toBeResolvedWith('Good job!');
        });
        it("should reject if the call failed", function() {
            var invokeDfd = invokeWithArguments('string', 3.6, null, true);
            mockWyrmhole.lastOutbound.error('could not invoke', 'Invalid arguments');
            expect(invokeDfd).toBeRejectedWith({ error: 'could not invoke', message: 'Invalid arguments' });
        });

        describe("passing complex arguments to a function", function() {
            it("should default to pass as ref", function() {
                invokeWithArguments(3, { isObj: true }, true);
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', [
                    3,
                    { $type: 'ref', data: [jasmine.any(Number), jasmine.any(Number)] },
                    true
                ]]);
            });
            it("should pass as val if requested", function() {
                invokeWithArguments(3, FireWyrmJS.asVal({ isObj: true }), true);
                clock.flush();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', [
                    3,
                    { $type: 'json', data: { isObj: true } },
                    true
                ]]);
            });


            // TODO TODO TODO: talk to Richard about this; is my initial assumption correct?
            //                 The more I think about it, the more I suspect we might instead
            //                 be sending along some weird object reference we created for their
            //                 alien wyrmling. But then, how do they ever get anything meaningul
            //                 back from us about it? Any time they ask for it, we're going to
            //                 see that it is a reference that we have to wrap in another
            //                 reference to respond to...
            //
            //                 Either I was right initially, or I'm overthinking it.

            //it("should pass objects that are already references untouched", function() {
                //invokeWithArguments(3, { $type: 'ref', data: [99, 100] }, true);
                //expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', fnSpawnId, fnObjectId, '', [
                    //3,
                    //{ $type: 'ref', data: [99, 100] },
                    //true
                //]]);
            //});
        });
    });

    describe("queenling.invoke", function() {
        it("should send 'Invoke' without first sending 'GetP'", function() {
            queenling.invoke(prop);
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', queenling.spawnId, queenling.objectId, prop, []]);
        });
        it("should accept n arguments and pass them along", function() {
            queenling.invoke(prop, null, 'string', { isObj: true });
            clock.flush();
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', queenling.spawnId, queenling.objectId, prop, [
                null,
                'string',
                { $type: 'ref', data: [jasmine.any(Number), jasmine.any(Number)] }
            ]]);
        });
        it("should return a promise", function() {
            var invokeDfd = queenling.invoke(prop, 6, 7);
            clock.flush();
            expect(invokeDfd).toBeThennable();
        });
        it("should ultimately resolve to the return value", function() {
            var invokeDfd = queenling.invoke(prop, 6, 7);
            clock.flush();
            mockWyrmhole.lastOutbound.success(42);
            expect(invokeDfd).toBeResolvedWith(42);
        });
        it("should reject if the call failed", function() {
            var invokeDfd = queenling.invoke(prop, 6, 7);
            clock.flush();
            mockWyrmhole.lastOutbound.error('could not invoke property', 'Property does not exist');
            expect(invokeDfd).toBeRejectedWith({ error: 'could not invoke property', message: 'Property does not exist' });
        });
    });


    /******************************************************************
     * Error cases
     ******************************************************************/
    describe("trying to invoke a primitive property", function() {
        it("should reject without even sending the 'Invoke' message", function() {
            var invokeDfd = queenling.intProp();
            mockWyrmhole.lastOutbound.success(42);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, 'intProp']);
            expect(invokeDfd).toBeRejectedWith({
                error: 'could not invoke',
                message: 'The object is not invokable'
            });
        });
    });
});
