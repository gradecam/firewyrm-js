/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
const makeDfd = require('../dist/dfd').makeDfd;
var FireWyrmJS = require('../dist/firewyrm').default;
var clock = require('./helpers/clock');
var lifecycle = require('./helpers/lifecycle');

describe("creating objects locally of a specified object type", function() {
    var fw, mockWyrmhole,
    type = 'application/x-wyrmtest';

    beforeEach(function() {
        clock.install();

        mockWyrmhole = lifecycle.newMockWyrmhole();
        fw = new FireWyrmJS(mockWyrmhole);
    });
    afterEach(function() {
        clock.uninstall();
    });

    describe("if the type is unregistered", function() {
        it("should reject if 'New' is called", function() {
            mockWyrmhole.triggerInbound(['New', 'stuff', {}]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object type', message: 'Object type stuff is not supported' });
        });
    });

    describe("registering a new type", function() {
        it("should succeed if type and factory function are provided", function() {
            expect(fw.registerObjectType(type, function(){})).toBeResolved();
        });
        it("should succeed if function is a promise that resolves to a function", function() {
            var fnDfd = makeDfd();
            fnDfd.resolve(function(){});
            expect(fw.registerObjectType(type, fnDfd.promise)).toBeResolved();
        });
        it("should fail if type is an empty string", function() {
            expect(fw.registerObjectType('', function(){})).toBeRejected();
        });
        it("should fail if type is a non-string", function() {
            expect(fw.registerObjectType(1, function(){})).toBeRejected();
        });
        it("should fail if factory is a non-function", function() {
            expect(fw.registerObjectType(type, null)).toBeRejected();
        });
    });

    describe("if the type is registered", function() {
        var factory, createArgs, princessling;
        beforeEach(function() {
            createArgs = princessling = (void 0);
            factory = function(args) {
                createArgs = args;
                var obj = {
                    strProp: 'string',
                    fnProp: function(a, b) { return a * b; },
                    complexProp: {
                        nested: {
                            isObj: true
                        }
                    },
                    _destroyed: false,
                    _onDestroy: function() {
                        obj._destroyed = true;
                    }
                };
                Object.defineProperty(obj, 'readonlyProp', {
                    enumerable: true,
                    value: 42
                });

                princessling = obj;
                return obj;
            };
            fw.registerObjectType(type, factory);
        });
        it("should return an incrementing spawnId each time 'New' is called", function() {
            mockWyrmhole.triggerInbound(['New', type, {}]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toBe(1);
            mockWyrmhole.triggerInbound(['New', type, {}]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toBe(2);
        });
        it("should be passed the proper args", function() {
            mockWyrmhole.triggerInbound(['New', type, { createArg: 42 }]);
            expect(createArgs).toEqual({ createArg: 42 });
        });

        describe("the new root object (princessling)", function() {
            beforeEach(function() {
                mockWyrmhole.triggerInbound(['New', type, {}]);
            });

            it("should respond to 'Enum' requests for the new root object", function() {
                mockWyrmhole.triggerInbound(['Enum', 1, 0]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual(['strProp', 'fnProp', 'complexProp', 'readonlyProp']);
            });

            describe("'GetP' requests for the new root object", function() {
                it("should succeed for legitimate properties", function() {
                    mockWyrmhole.triggerInbound(['GetP', 1, 0, 'strProp']);
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toBe('string');
                });
                it("should fail for bogus properties", function() {
                    mockWyrmhole.triggerInbound(['GetP', 1, 0, 'bogus']);
                    expect(mockWyrmhole.lastInbound.status).toBe('error');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not get property', message: 'Property does not exist on this object' });
                });
            });

            describe("'SetP' requests for the new root object", function() {
                it("should work for writable properties", function() {
                    mockWyrmhole.triggerInbound(['SetP', 1, 0, 'strProp', 'a different string']);
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toBe(null);
                    expect(princessling.strProp).toBe('a different string');
                });
                it("should fail for non-writable properties", function() {
                    mockWyrmhole.triggerInbound(['SetP', 1, 0, 'readonlyProp', 'something']);
                    expect(princessling.readonlyProp).toBe(42);
                    expect(mockWyrmhole.lastInbound.status).toBe('error');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not set property', message: jasmine.any(String)});
                });
                it("should fail for bogus properties", function() {
                    mockWyrmhole.triggerInbound(['SetP', 1, 0, 'bogus', 'something']);
                    expect(mockWyrmhole.lastInbound.status).toBe('error');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not set property', message: 'Property does not exist on this object' });
                });
            });

            describe("'DelP' requests for the new root object", function() {
                it("should work for configurable properties", function() {
                    mockWyrmhole.triggerInbound(['DelP', 1, 0, 'strProp']);
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toBe(null);
                    expect(princessling.strProp).toBeUndefined();
                });
                it("should fail for non-configurable properties", function() {
                    mockWyrmhole.triggerInbound(['DelP', 1, 0, 'readonlyProp']);
                    expect(princessling.readonlyProp).toBe(42);
                    expect(mockWyrmhole.lastInbound.status).toBe('error');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not delete property', message: jasmine.any(String)});
                    it("should fail for bogus properties", function() {
                        mockWyrmhole.triggerInbound(['DelP', 1, 0, 'bogus']);
                        expect(mockWyrmhole.lastInbound.status).toBe('error');
                        expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not delete property', message: 'Property does not exist on this object' });
                    });
                });
            });

            describe("'Invoke' requests for the new root object", function() {
                it("should work for function properties", function() {
                    mockWyrmhole.triggerInbound(['Invoke', 1, 0, 'fnProp', [6,7]]);
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toBe(42);
                });
                it("should fail for non-function properties", function() {
                    mockWyrmhole.triggerInbound(['Invoke', 1, 0, 'strProp', [6,7]]);
                    expect(mockWyrmhole.lastInbound.status).toBe('error');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not invoke property', message: 'Property is not callable' });
                });
                it("should fail for bogus properties", function() {
                    mockWyrmhole.triggerInbound(['Invoke', 1, 0, 'bogus', [6,7]]);
                    expect(mockWyrmhole.lastInbound.status).toBe('error');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not invoke property', message: 'Property does not exist on this object' });
                });
            });

            describe("complex objects", function() {
                beforeEach(function() {
                    mockWyrmhole.triggerInbound(['GetP', 1, 0, 'complexProp']);
                });
                it("should be returned by reference", function() {
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ $type: 'ref', data: [1, 1] }); // princessling 1, first object
                });
                it("should be able to 'Enum' returned objects", function() {
                    mockWyrmhole.triggerInbound(['Enum', 1, 1]);
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toEqual(['nested']);
                });
                it("should be able to 'GetP' returned objects", function() {
                    mockWyrmhole.triggerInbound(['GetP', 1, 1, 'nested']);
                    expect(mockWyrmhole.lastInbound.status).toBe('success');
                    expect(mockWyrmhole.lastInbound.response).toEqual({ $type: 'ref', data: [1, 2]}); // also passed by reference
                });
            });
        });

        describe("handling 'Destroy'", function() {
            beforeEach(function() {
                mockWyrmhole.triggerInbound(['New', type, { createArg: 42 }]);
            });
            it("should return the spawnId of the destroyed princessling", function() {
                mockWyrmhole.triggerInbound(['Destroy', 1]);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toBe(1);
            });
            it("should fail if you try to destroy it twice", function() {
                mockWyrmhole.triggerInbound(['Destroy', 1]);
                mockWyrmhole.triggerInbound(['Destroy', 1]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'could not destroy object', message: 'The object does not exist' });
            });
            it("should no longer be possible to access the object", function() {
                mockWyrmhole.triggerInbound(['Destroy', 1]);
                mockWyrmhole.triggerInbound(['Enum', 1, 0]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist' });
            });
            it("should no longer be possible to access objects it had returned by reference", function() {
                // get some nested objects
                mockWyrmhole.triggerInbound(['GetP', 1, 0, 'complexProp']);
                mockWyrmhole.triggerInbound(['GetP', 1, 1, 'nested']);
                expect(mockWyrmhole.lastInbound.status).toBe('success');
                expect(mockWyrmhole.lastInbound.response).toEqual({ $type: 'ref', data: jasmine.any(Array) });

                // destroy, they should be inaccessible
                mockWyrmhole.triggerInbound(['Destroy', 1]);
                mockWyrmhole.triggerInbound(['GetP', 1, 1, 'nested']);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist' });
            });
            it("should be possible to register a special _onDestroy handler", function() {
                mockWyrmhole.triggerInbound(['Destroy', 1]);
                expect(princessling._destroyed).toBe(true);
            });
            it("should RelObj any properties set by the other side via SetP", function() {
                mockWyrmhole.triggerInbound(['SetP', 1, 0, 'complexProp', { $type: 'ref', data: [666, 667]}]);
                mockWyrmhole.lastOutbound.success([]); // respond to Enum
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 666, 667]);
                mockWyrmhole.triggerInbound(['Destroy', 1]);
                expect(mockWyrmhole.lastOutbound.args).toEqual(['RelObj', 666, 667]);
            });
        });
    });
});
