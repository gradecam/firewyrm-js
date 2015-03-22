/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var _ = require('underscore');
var clockHelpers = require('./helpers/clock');
var fw = require('../src/firewyrm');
var MockWyrmHole = require('../src/mockWyrmHole');
//var ConsoleWyrmHole = require('../src/consoleWyrmHole');
var lifecycle = require('./helpers/lifecycle');

describe("firewyrm", function() {
    beforeEach(function() {
        jasmine.clock().install();
        clockHelpers.addFlushMethod();
    });
    afterEach(function() {
        jasmine.clock().uninstall();
    });

    describe("creating the queenling", function() {
        var mockWyrmHole, queenling, mimetype = 'application/x-bigwyrm',
            createArgs, enumProps;
        beforeEach(function() {
            createArgs = {};
            enumProps = ['intProp', 'stringProp', 'arrayProp', 'functionProp'];
            mockWyrmHole = new MockWyrmHole();
            mockWyrmHole.flushClockFn = jasmine.clock().flush; // so it can flush after responding to a message
            queenling = fw.create(mockWyrmHole, mimetype, createArgs);
        });
        it("should return a thennable", function() {
            expect(queenling).toBeThennable();
        });
        it("should immediately send the mimetype and params over the WyrmHole", function() {
            expect(mockWyrmHole.lastMessage.args).toEqual(['New', mimetype, createArgs]);
        });
        it("should send 'Enum' message with the provided spawnId after 'New' returns", function() {
            mockWyrmHole.lastMessage.respond('success', mockWyrmHole.spawnId);
            expect(mockWyrmHole.lastMessage.args).toEqual('Enum', mockWyrmHole.spawnId, 0);
        });
        it("should ultimately resolve the queenling", function() {
            mockWyrmHole.lastMessage.respond('success', mockWyrmHole.spawnId); // respond to "New"
            mockWyrmHole.lastMessage.respond('success', enumProps); // respond to "Enum"
            expect(queenling).toBeResolved();
        });
        describe("after the queenling is resolved", function() {
            beforeEach(function() {
                queenling = lifecycle.getResolvedQueenling(mockWyrmHole);
            });
            it("should make note of its spawnId and objectId", function() {
                expect(queenling.spawnId).toBe(mockWyrmHole.spawnId);
                expect(queenling.objectId).toBe(0);
            });
            it("should have a generic property getter and setter", function() {
                expect(queenling.getProperty).toEqual(jasmine.any(Function));
                expect(queenling.setProperty).toEqual(jasmine.any(Function));
            });
            it("should have properties for each of the items received from Enum", function() {
                _.each(enumProps, function(prop) {
                    expect(queenling.hasOwnProperty(prop)).toBe(true);
                });
            });
        });
    });
});
