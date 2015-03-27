/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var lifecycle = require('./helpers/lifecycle');

describe("receiving objects from the Wyrmhole", function() {
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

    describe("objects sent as JSON", function() {
        it("should resolve to the actual object", function() {
            var getDfd = queenling.getProperty(prop);
            mockWyrmhole.lastOutbound.success({ $type: 'json', data: { isObj: true } });
            expect(getDfd).toBeResolvedWith({ isObj:true });
        });
    });

    describe("objects sent by reference", function() {
        var resp;
        beforeEach(function() {
            resp = (void 0);
        });
        it("should resolve to a wyrmling", function() {
            queenling.getProperty(prop).then(function(thing) { resp = thing; });
            mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61] });
            // respond to 'Enum'
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            mockWyrmhole.lastOutbound.success(['a','b','c']);
            expect(resp).toBeAWyrmling();
        });
        it("should have special, callable promises for each 'Enum'd property (just like queenling)", function() {
            queenling.getProperty(prop).then(function(thing) { resp = thing; });
            mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [60, 61] });
            // respond to 'Enum'
            expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
            mockWyrmhole.lastOutbound.success(['a','b','c']);
            expect(resp).toBeAWyrmling();
            expect(resp.a).toEqual(jasmine.any(Function));
            expect(resp.a).toBeThennable();
        });
    });

    describe("plain objects / arrays received from the other side (annoying, magical special case)", function() {
        var resp;
        beforeEach(function() {
            resp = (void 0);
        });
        it("should resolve plain objects to plain objects", function() {
            queenling.getProperty(prop).then(function(thing) {
                resp = thing;
            });
            mockWyrmhole.lastOutbound.success({ isObj: true });
            expect(resp).toEqual({ isObj: true });
        });
        it("should resolve plain arrays to plain arrays", function() {
            queenling.getProperty(prop).then(function(thing) {
                resp = thing;
            });
            mockWyrmhole.lastOutbound.success([1, { isObj: true }]);
            expect(resp).toEqual([1, { isObj: true }]);
        });

        describe("objects with nested special types", function() {
            it("should resolve the nested types correctly", function() {
                queenling.getProperty(prop).then(function(thing) {
                    resp = thing;
                });
                mockWyrmhole.lastOutbound.success({
                    nestedJson: { $type: 'json', data: { isObj: true} },
                    nestedRef: { $type: 'ref', data: [60, 61] },
                    nestedBinary: { $type: 'binary', data: 'Mg==' },
                    nestedSimple: true
                });
                // respond to 'Enum'
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                mockWyrmhole.lastOutbound.success(['a','b','c']);
                expect(resp).toEqual({
                    nestedJson: { isObj: true },
                    nestedRef: jasmine.any(Function), // alien wyrmling
                    nestedBinary: jasmine.any(ArrayBuffer),
                    nestedSimple: true
                });
                expect(resp.nestedRef).toBeAWyrmling();
            });
            it("should work the same for invoking getters as it does for getProperty", function() {
                queenling[prop]().then(function(thing) {
                    resp = thing;
                });
                // respond to GetP
                mockWyrmhole.lastOutbound.success({ $type: 'ref', data: [ 50, 51 ]});
                // respond to Enum
                mockWyrmhole.lastOutbound.success(['length']);
                clock.flush(); // because the outbound arguments need to be sanitized first
                // respond to 'Invoke'
                mockWyrmhole.lastOutbound.success({
                    nestedJson: { $type: 'json', data: { isObj: true} },
                    nestedRef: { $type: 'ref', data: [60, 61] },
                    nestedBinary: { $type: 'binary', data: 'Mg==' },
                    nestedSimple: true
                });
                // respond to 'Enum'
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                mockWyrmhole.lastOutbound.success(['a','b','c']);
                expect(resp).toEqual({
                    nestedJson: { isObj: true },
                    nestedRef: jasmine.any(Function), // alien wyrmling
                    nestedBinary: jasmine.any(ArrayBuffer),
                    nestedSimple: true
                });
                expect(resp.nestedRef).toBeAWyrmling();
            });
            it("should work the same for invoke as it does for getProperty", function() {
                queenling.invoke(prop, []).then(function(thing) {
                    resp = thing;
                });
                clock.flush(); // because the outbound arguments need to be sanitized first
                mockWyrmhole.lastOutbound.success({
                    nestedJson: { $type: 'json', data: { isObj: true} },
                    nestedRef: { $type: 'ref', data: [60, 61] },
                    nestedBinary: { $type: 'binary', data: 'Mg==' },
                    nestedSimple: true
                });
                // respond to 'Enum'
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                mockWyrmhole.lastOutbound.success(['a','b','c']);
                expect(resp).toEqual({
                    nestedJson: { isObj: true },
                    nestedRef: jasmine.any(Function), // alien wyrmling
                    nestedBinary: jasmine.any(ArrayBuffer),
                    nestedSimple: true
                });
                expect(resp.nestedRef).toBeAWyrmling();
            });
            it("should resolve deeply nested objects correctly", function() {
                queenling.getProperty(prop).then(function(thing) {
                    resp = thing;
                });
                mockWyrmhole.lastOutbound.success({
                    level1: {
                        nestedBinary: { $type: 'binary', data: 'Mg==' },
                        level2: [
                            1,
                            { $type: 'json', data: { isObj: true} },
                            {
                                nestedRef: { $type: 'ref', data: [60, 61] }
                            }
                        ]
                    },
                    nestedSimple: true
                });
                // respond to 'Enum'
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                mockWyrmhole.lastOutbound.success(['a','b','c']);
                expect(resp).toEqual({
                    level1: {
                        nestedBinary: jasmine.any(ArrayBuffer),
                        level2: [
                            1,
                            {
                                isObj: true
                            },
                            {
                                nestedRef: jasmine.any(Function),
                            }
                        ]
                    },
                    nestedSimple: true
                });
                expect(resp.level1.level2[2].nestedRef).toBeAWyrmling();
            });
            it("should resolve as many wyrmlings as it finds (in order)", function() {
                queenling.getProperty(prop).then(function(thing) {
                    resp = thing;
                });
                mockWyrmhole.lastOutbound.success({
                    wyrm1: { $type: 'ref', data: [60, 61] },
                    nested: {
                        wyrm2: { $type: 'ref', data: [70, 71] },
                    },
                    arr: [ 1, { $type: 'ref', data: [80, 81] }, 3],
                });

                // respond to 'Enum'
                var wyrm1Enum = mockWyrmhole.getOutbound(-3);
                var wyrm2Enum = mockWyrmhole.getOutbound(-2);
                var wyrm3Enum = mockWyrmhole.getOutbound(-1);
                expect(wyrm1Enum.args).toEqual(['Enum', 60, 61]);
                wyrm1Enum.success(['a','b','c']);
                expect(wyrm2Enum.args).toEqual(['Enum', 70, 71]);
                wyrm2Enum.success([]);
                expect(wyrm3Enum.args).toEqual(['Enum', 80, 81]);
                wyrm3Enum.success(['x','y','z']);

                expect(resp).toEqual({
                    wyrm1: jasmine.any(Function),
                    nested: {
                        wyrm2: jasmine.any(Function),
                    },
                    arr: [ 1, jasmine.any(Function), 3 ]
                });
                expect(resp.wyrm1).toBeAWyrmling();
                expect(resp.nested.wyrm2).toBeAWyrmling();
                expect(resp.arr[1]).toBeAWyrmling();
            });
        });

        describe("arrays with nested special types", function() {
            it("should resolve the nested types correctly", function() {
                queenling.getProperty(prop).then(function(thing) {
                    resp = thing;
                });
                mockWyrmhole.lastOutbound.success([
                    { $type: 'json', data: { isObj: true} },
                    {
                        nestedRef: { $type: 'ref', data: [60, 61] },
                    },
                    { $type: 'binary', data: 'Mg==' },
                    true
                ]);
                // respond to 'Enum'
                expect(mockWyrmhole.lastOutbound.args).toEqual(['Enum', 60, 61]);
                mockWyrmhole.lastOutbound.success(['a','b','c']);
                expect(resp).toEqual([
                    { isObj: true },
                    {
                        nestedRef: jasmine.any(Function)
                    },
                    jasmine.any(ArrayBuffer),
                    true
                ]);
                expect(resp[1].nestedRef).toBeAWyrmling();
            });
        });
    });

    // TODO: make sure received alienWyrmlings call RelObj automatically (unless we retain them)
});
