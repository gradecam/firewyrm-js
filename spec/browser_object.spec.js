/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var b64Buffer = require('base64-arraybuffer');
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var FireWyrmJS = require('../src/firewyrm');
var lifecycle = require('./helpers/lifecycle');

describe("browser object", function() {
    var mockWyrmhole, queenling, browserSpawnId, propSpawnId, propObjectId,
        fakeWindow, fakeDocument,
        complexProp = defaults.newQueenlingProps[2], // complexProp
        fnProp = defaults.newQueenlingProps[3]; // functionProp

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
    function setLocalWyrmling(obj, prop) {
        prop = prop || complexProp;
        // send via queenling so it gets saved off as a local wyrmling
        queenling[prop] = obj;
        clock.flush(); // handle prepOutboundValue
        propSpawnId = mockWyrmhole.lastOutbound.args[4].data[0];
        propObjectId = mockWyrmhole.lastOutbound.args[4].data[1];
        mockWyrmhole.lastOutbound.success(null); // respond to SetP
        return [propSpawnId, propObjectId];
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

    describe("readArray", function() {
        it("should return the array kinda-mostly-sorta by value", function() {
            setLocalWyrmling([ 2, false, 'string', { isObj: true} ]);
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'readArray', [{ $type: 'local-ref', data: [propSpawnId, propObjectId]}]]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toEqual([2, false, 'string', { $type: 'ref', data: jasmine.any(Array)}]);
        });
        it("should fail if the spawnId / objectId combination is bad", function() {
            mockWyrmhole.triggerInbound(['Invoke', 666, 999, 'readArray', [{ $type: 'local-ref', data: [propSpawnId, propObjectId]}]]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist' });
        });
        it("should fail if a non-array is provided", function() {
            setLocalWyrmling({ isObj: true });
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'readArray', [{ $type: 'local-ref', data: [propSpawnId, propObjectId]}]]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'Object is not an array' });
        });
    });

    describe("readObject", function() {
        it("should return the object kinda-mostly-sorta by value", function() {
            setLocalWyrmling({
                a: 1,
                buf: FireWyrmJS.asVal(b64Buffer.decode('Mg==')),
                arr: [3],
                str: 'string'
            });
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'readObject', [{ $type: 'local-ref', data: [propSpawnId, propObjectId]}]]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toEqual({
                a: 1,
                buf: { $type: 'binary', data: 'Mg==' },
                arr: { $type: 'ref', data: jasmine.any(Array) },
                str: 'string'
            });
        });
        it("should fail if the spawnId / objectId combination is bad", function() {
            mockWyrmhole.triggerInbound(['Invoke', 666, 999, 'readObject', [{ $type: 'local-ref', data: [propSpawnId, propObjectId]}]]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'The object does not exist' });
        });
        it("should fail if a non-object is provided", function() {
            setLocalWyrmling([ 1 ]);
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'readObject', [{ $type: 'local-ref', data: [propSpawnId, propObjectId]}]]);
            expect(mockWyrmhole.lastInbound.status).toBe('error');
            expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid object', message: 'Object is not a plain object' });
        });
    });

    describe("invokeWithDelay", function() {
        var delay = 100, fn, args, context,
            fnSpawnId, fnObjectId;
        beforeEach(function() {
            fn = args = context = (void 0);
            delete global.__invokeWithDelayResult;
            delete global.__invokeWithDelayArguments;
            fn = function(a, b) {
                global.__invokeWithDelayResult = this + ': ' + a + ' ' + b;
                global.__invokeWithDelayArguments = Array.prototype.slice.call(arguments, 0);
            };
            var ids = setLocalWyrmling(fn, fnProp);
            fnSpawnId = ids[0];
            fnObjectId = ids[1];
            context = { isObj: true };
            context.toString = function() { return '[WYRMTEST]'; };
            setLocalWyrmling(context);

        });
        it("should return null", function() {
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'invokeWithDelay', [
                delay,
                { $type: 'local-ref', data: [fnSpawnId, fnObjectId] },
                ['a', 'b'],
                { $type: 'local-ref', data: [propSpawnId, propObjectId] },
            ]]);
            expect(mockWyrmhole.lastInbound.status).toBe('success');
            expect(mockWyrmhole.lastInbound.response).toBe(null);
        });
        it("should only invoke the function after the specified delay", function() {
            var _flush = clock.flush;
            clock.flush = function() {};
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'invokeWithDelay', [
                delay,
                { $type: 'local-ref', data: [fnSpawnId, fnObjectId] },
                ['a', 'b'],
                { $type: 'local-ref', data: [propSpawnId, propObjectId] },
            ]]);
            expect(global.__invokeWithDelayResult).toBeUndefined();
            jasmine.clock().tick(100);
            expect(global.__invokeWithDelayResult).toEqual('[WYRMTEST]: a b');
            clock.flush = _flush;
        });
        it("should resolve nested wyrmlings within the args array", function() {
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'invokeWithDelay', [
                delay,
                { $type: 'local-ref', data: [fnSpawnId, fnObjectId] },
                [
                    'a',
                    'b',
                    { $type: 'ref', data: [666, 667] },
                    { nested: { $type: 'ref', data: [777, 778] } }
                ],
                { $type: 'local-ref', data: [propSpawnId, propObjectId] },
            ]]);
            expect(mockWyrmhole.getOutbound(-2).args).toEqual(['Enum', 666, 667]);
            mockWyrmhole.getOutbound(-2).success([]);
            expect(mockWyrmhole.getOutbound(-1).args).toEqual(['Enum', 777, 778]);
            mockWyrmhole.getOutbound(-1).success([]);
            expect(global.__invokeWithDelayArguments[2]).toBeAWyrmling();
            expect(global.__invokeWithDelayArguments[3].nested).toBeAWyrmling();
        });
        it("should use null as the context if not provided", function() {
            mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'invokeWithDelay', [
                delay,
                { $type: 'local-ref', data: [fnSpawnId, fnObjectId] },
                ['a', 'b']
            ]]);
            expect(global.__invokeWithDelayResult).toEqual('null: a b');
        });

        describe("failure cases", function() {
            it("should blow up if a non-numeric delay is provided", function() {
                mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'invokeWithDelay', [
                    '100',
                    { $type: 'local-ref', data: [fnSpawnId, fnObjectId] },
                    ['a', 'b']
                ]]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid parameters', message: jasmine.any(String)});
            });
            it("should blow up if a non-function fn is provided", function() {
                mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'invokeWithDelay', [
                    100,
                    { $type: 'local-ref', data: [propSpawnId, propObjectId] },
                    ['a', 'b']
                ]]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid parameters', message: jasmine.any(String)});
            });
            it("should blow up if a non-array fn is provided", function() {
                mockWyrmhole.triggerInbound(['Invoke', browserSpawnId, 0, 'invokeWithDelay', [
                    100,
                    { $type: 'local-ref', data: [fnSpawnId, fnObjectId] },
                    'a'
                ]]);
                expect(mockWyrmhole.lastInbound.status).toBe('error');
                expect(mockWyrmhole.lastInbound.response).toEqual({ error: 'invalid parameters', message: jasmine.any(String)});
            });
        });
    });
});
