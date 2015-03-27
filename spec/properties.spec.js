/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var _ = require('underscore');
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var lifecycle = require('./helpers/lifecycle');

describe("queenling properties", function() {
    var mockWyrmhole, queenling,
        prop = defaults.newQueenlingProps[0];

    beforeEach(function() {
        clock.install();

        mockWyrmhole = lifecycle.newMockWyrmhole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmhole);
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
                expect(mockWyrmhole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            });
            it("should resolve with the response", function() {
                mockWyrmhole.lastOutbound.respond('success', 42);
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
                expect(mockWyrmhole.lastOutbound.args).toEqual(['GetP', queenling.spawnId, queenling.objectId, prop]);
            });
            it("should resolve with the response", function() {
                mockWyrmhole.lastOutbound.respond('success', 42);
                expect(getDfd).toBeResolvedWith(42);
            });
            it("should reject if the call failed", function() {
                mockWyrmhole.lastOutbound.error('could not get property', 'Property does not exist');
                expect(getDfd).toBeRejectedWith({ error: 'could not get property', message: 'Property does not exist' });
            });

            describe("properties that can't be defined on Functions", function() {
                it("should silently be ignored", function() {
                    queenling = lifecycle.getResolvedQueenling(mockWyrmhole, 'mimetype', {}, ['a','length']);
                    // this property was defined
                    expect(queenling.a).toEqual(jasmine.any(Function));
                    // this property was not
                    expect(queenling.length).toEqual(jasmine.any(Number));
                });
            });
        });
    });

    describe("setters (simple properties)", function() {
        describe("setProperty", function() {
            var setDfd;
            beforeEach(function() {
                setDfd = queenling.setProperty(prop, 42);
                clock.flush();
            });
            it("should exist as a generic setter", function() {
                expect(queenling.setProperty).toEqual(jasmine.any(Function));
            });
            it("should return a promise", function() {
                expect(setDfd).toBeThennable();
            });
            it("should send SetP", function() {
                expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, 42]);
            });
            it("should resolve with return when done", function() {
                mockWyrmhole.lastOutbound.respond('success', null);
                expect(setDfd).toBeResolvedWith(null);
            });
            it("should reject with error message if failed", function() {
                mockWyrmhole.lastOutbound.error('could not set property', 'Property is read-only');
                expect(setDfd).toBeRejectedWith({error: 'could not set property', message: 'Property is read-only'});
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
                clock.flush();
                expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, 42]);
            });
            // we don't get meaningful return values from a setter, so no use to test promises here...
        });
    });
});
