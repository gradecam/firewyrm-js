/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var lifecycle = require('./helpers/lifecycle');

describe("releasing objects received over the Wyrmhole", function() {
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

    describe("GetP", function() {
        it("should automatically release objects that haven't been retained", function() {
            var x = queenling[prop];
            expect(mockWyrmhole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61]});
            // We should now have a wrapped alienWyrmling which calls Enum.
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            mockWyrmhole.lastOutbound.success([]);
            // we're now done with our automatic workflows and x should be a wyrmling
            expect(x).toBeResolved();
            // we didn't retain, so next should be 'RelObj' on the result of the GetP
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });

        describe("if an object is manually retained", function() {
            var alien;
            beforeEach(function() {
                queenling[prop].then(function(wyrmling) {
                    alien = wyrmling;
                    alien.retain();
                });
                mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61]});
                // answer Enum
                mockWyrmhole.lastOutbound.success([]);
            });
            it("should not be released automatically", function() {
                expect(alien).toBeAWyrmling();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            });
            it("should be released asynchronously if release is called", function() {
                alien.release();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                clock.flush();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
            });

            describe("if retain has been called multiple times", function() {
                beforeEach(function() {
                    alien.retain();
                    alien.retain(); // 3 times!
                    clock.flush();
                });
                it("should not send RelObj until retain has been called as many times", function() {
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                    // first release
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                    // second release
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                    // third release should finally result in RelObj
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
                });
            });
        });
    });

    describe("Invoke", function() {
        it("should automatically release objects that haven't been retained", function() {
            var x = queenling.invoke(prop);
            clock.flush(); // handle prepOutboundArguments
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', queenling.spawnId, queenling.objectId, prop, []]);
            mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61]});
            // We should now have a wrapped alienWyrmling which calls Enum.
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            mockWyrmhole.lastOutbound.success([]);
            // we're now done with our automatic workflows and x should be a wyrmling
            expect(x).toBeResolved();
            // we didn't retain, so next should be 'RelObj' on the result of the Invoke
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });

        describe("if an object is manually retained", function() {
            var alien;
            beforeEach(function() {
                queenling.invoke(prop).then(function(wyrmling) {
                    alien = wyrmling;
                    alien.retain();
                });
                clock.flush(); // handle prepOutboundArguments
                mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61]});
                // answer Enum
                mockWyrmhole.lastOutbound.success([]);
            });
            it("should not be released automatically", function() {
                expect(alien).toBeAWyrmling();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            });
            it("should be released asynchronously if release is called", function() {
                alien.release();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                clock.flush();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
            });

            describe("if retain has been called multiple times", function() {
                beforeEach(function() {
                    alien.retain();
                    alien.retain(); // 3 times!
                    clock.flush();
                });
                it("should not send RelObj until retain has been called as many times", function() {
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                    // first release
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                    // second release
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                    // third release should finally result in RelObj
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
                });
            });
        });
    });

    describe("GetP+Invoke", function() {
        it("should automatically release objects that haven't been retained", function() {
            var x = queenling[prop]();
            // first should be 'GetP'
            expect(mockWyrmhole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [50, 51]});
            // next should be 'Enum' for that thing
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 50, 51]);
            mockWyrmhole.lastOutbound.success([]);
            // next should be 'Invoke'
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Invoke', 50, 51, '', []]);
            mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61]});
            // we should now have a wrapped alienWyrmling which calls 'Enum'
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            mockWyrmhole.lastOutbound.success([]);
            // we're now done with our automatic workflows and x should be a wyrmling
            expect(x).toBeResolved();
            // we didn't retain, so it should release them both in reverse order
            expect(mockWyrmhole.getOutbound(-2).args).toEqual(['RelObj', 60, 61]);
            expect(mockWyrmhole.getOutbound(-1).args).toEqual(['RelObj', 50, 51]);
        });

        describe("if the response object is manually retained", function() {
            var alien;
            beforeEach(function() {
                queenling[prop]().then(function(wyrmling) {
                    alien = wyrmling;
                    alien.retain();
                });
                // answer GetP
                mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [50, 51]});
                // answer GetP's Enum
                mockWyrmhole.lastOutbound.success([]);
                // answer Invoke
                mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61]});
                // answer Invoke's Enum
                mockWyrmhole.lastOutbound.success([]);
            });
            it("should automatically release the wyrmling from GetP", function() {
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 50, 51]);
            });
            it("should not autorelease the invoke response automatically", function() {
                mockWyrmhole.lastOutbound.success(null); // respond to RelObj for the GetP object
                expect(alien).toBeAWyrmling();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 50, 51]);
            });
            it("should release the invoke response asynchronously if release is called", function() {
                mockWyrmhole.lastOutbound.success(null); // respond to RelObj for the GetP object
                alien.release();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 50, 51]);
                clock.flush();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
            });

            describe("if retain has been called multiple times on the invoke response", function() {
                beforeEach(function() {
                    alien.retain();
                    alien.retain(); // 3 times!
                    mockWyrmhole.lastOutbound.success(null); // respond to RelObj for the GetP object
                });
                it("should not send RelObj until retain has been called as many times", function() {
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 50, 51]);
                    // first release
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 50, 51]);
                    // second release
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 50, 51]);
                    // third release should finally result in RelObj
                    alien.release();
                    clock.flush();
                    expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
                });
            });
        });
    });

    describe("objects sent by the other side via Invoke", function() {
        function setLocalWyrmling(obj) {
            // send via queenling so it gets saved off as a local wyrmling
            queenling[prop] = obj;
            clock.flush(); // handle prepOutboundValue
            var propSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
            var propObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
            mockWyrmhole.lastOutbound.success(null); // respond to SetP
            return [propSpawnId, propObjectId];
        }
        it("should autorelease wyrmlings sent as function arguments", function() {
            var ids = setLocalWyrmling(function(){});
            mockWyrmhole.triggerInbound(['Invoke', ids[0], ids[1], '', [
                { $type: 'ref', data: [666, 667] }
            ]]);
            mockWyrmhole.lastOutbound.success([]); // respond to Enum
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 666, 667]);
        });

        describe("if the function argument is retained", function() {
            var alien;
            beforeEach(function() {
                var ids = setLocalWyrmling(function(thing) {
                    alien = thing;
                    alien.retain();
                });
                mockWyrmhole.triggerInbound(['Invoke', ids[0], ids[1], '', [
                    { $type: 'ref', data: [666, 667] }
                ]]);
                mockWyrmhole.lastOutbound.success([]); // respond to Enum
            });
            it("should not autorelease", function() {
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 666, 667]);
            });
            it("should send RelObj asynchronously after we release the object", function() {
                alien.release();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 666, 667]);
                clock.flush();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 666, 667]);
            });
        });
    });

    describe("objects sent by the other side via SetP", function() {
        var obj, objSpawnId, objObjectId;
        beforeEach(function() {
            obj = { data: true };
            queenling[prop] = obj;
            clock.flush(); // handle prepOutboundValue
            objSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
            objObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
            mockWyrmhole.lastOutbound.success(null);
            // set a wyrmling on the object
            mockWyrmhole.triggerInbound(['SetP', objSpawnId, objObjectId, 'data', { $type: 'ref', data: [60, 61]}]);
            mockWyrmhole.lastOutbound.success([]); // respond to Enum
        });
        it("should not autorelease the object", function() {
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            // even after 10 seconds, it should not have been released
            jasmine.clock().tick(10000);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
        });
        it("should release the object of the other side sets the property again", function() {
            mockWyrmhole.triggerInbound(['SetP', objSpawnId, objObjectId, 'data', false]);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
        it("should release the object after 10 seconds if our side replaces the value", function() {
            obj.data = false;
            // first 5 seconds are for detecting that the value has been changed
            jasmine.clock().tick(5000);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            // next 5 seconds are for the 5000ms delay to call RelObj
            jasmine.clock().tick(4999);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            jasmine.clock().tick(1);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
        it("should release the object if the original wyrmling gets released", function() {
            mockWyrmhole.triggerInbound(['RelObj', objSpawnId, objObjectId]);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
    });

    describe("after objects have been released", function() {
        var alien, expectedError = { error: 'invalid object', message: 'The object has been released' };
        beforeEach(function() {
            alien = (void 0);
            queenling[prop].then(function(thing) {
                alien = thing;
            });
            mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61]}); // respond to GetP
            mockWyrmhole.lastOutbound.success(['someProp']); // respond to Enum
            mockWyrmhole.lastOutbound.success(null); // respond to RelObj
        });
        it("should reject immediately if getProperty is called", function() {
            expect(alien.getProperty('someProp')).toBeRejectedWith(expectedError);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
        it("should reject immediately if setProperty is called", function() {
            expect(alien.setProperty('someProp', true)).toBeRejectedWith(expectedError);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
        it("should reject immediately if invoke is called", function() {
            expect(alien.invoke('someProp', 1, 2)).toBeRejectedWith(expectedError);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
        it("should reject immediately if a getter is accessed", function() {
            expect(alien.someProp).toBeRejectedWith(expectedError);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
        it("should reject immediately if a getter is invoked", function() {
            expect(alien.someProp(1, 2)).toBeRejectedWith(expectedError);
            expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 60, 61]);
        });
    });
});
