/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var _ = require('underscore');
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var lifecycle = require('./helpers/lifecycle');

describe("queenling properties", function() {
    var mockWyrmHole, queenling,
        prop = defaults.newQueenlingProps[0];

    beforeEach(function() {
        clock.install();

        mockWyrmHole = lifecycle.newMockWyrmHole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmHole);
    });
    afterEach(function() {
        clock.uninstall();
    });

    describe("getters (simple properties)", function() {
        var getDfd;

        describe("getProperty", function() {
            beforeEach(function() {
                getDfd = queenling.getProperty(prop);
            });
            it("should exist as a generic getter", function() {
                expect(queenling.getProperty).toEqual(jasmine.any(Function));
            });
            it("should send GetP", function() {
                expect(mockWyrmHole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            });
            it("should resolve with the response", function() {
                mockWyrmHole.lastOutbound.respond('success', 42);
                expect(getDfd).toBeResolvedWith(42);
            });
        });

        describe("specific property getters", function() {
            beforeEach(function() {
                getDfd = queenling[prop];
            });
            it("should have a getter for each property returned by Enum", function() {
                _.each(defaults.newQueenlingProps, function(property) {
                    var descriptor = Object.getOwnPropertyDescriptor(queenling, property);
                    expect(descriptor.get).toEqual(jasmine.any(Function));
                });
            });
            it("should send GetP", function() {
                expect(mockWyrmHole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            });
            it("should resolve with the response", function() {
                mockWyrmHole.lastOutbound.respond('success', 42);
                expect(getDfd).toBeResolvedWith(42);
            });
        });
    });

    describe("setters (simple properties)", function() {
        describe("setProperty", function() {
            var setDfd;
            beforeEach(function() {
                setDfd = queenling.setProperty(prop, 42);
            });
            it("should exist as a generic setter", function() {
                expect(queenling.setProperty).toEqual(jasmine.any(Function));
            });
            it("should return a promise", function() {
                expect(setDfd).toBeThennable();
            });
            it("should send SetP", function() {
                expect(mockWyrmHole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, 42]);
            });
            it("should resolve when done", function() {
                mockWyrmHole.lastOutbound.respond('success', null);
                expect(setDfd).toBeResolved();
            });
        });

        describe("specific property setters", function() {
            it("should have a setter for each property returned by Enum", function() {
                _.each(defaults.newQueenlingProps, function(property) {
                    var descriptor = Object.getOwnPropertyDescriptor(queenling, property);
                    expect(descriptor.set).toEqual(jasmine.any(Function));
                });
            });
            it("should send SetP", function() {
                queenling[prop] = 42;
                expect(mockWyrmHole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objId, 42]);
            });
            // we don't get meaningful return values from a setter, so no use to test promises here...
        });
    });
});
