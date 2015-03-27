/* globals jasmine, beforeEach, afterEach, describe, it, expect */
'use strict';
var clock = require('./helpers/clock');
var defaults = require('./helpers/defaults');
var FireWyrmJS = require('../src/firewyrm');
var lifecycle = require('./helpers/lifecycle');
var b64Buffer = require('base64-arraybuffer');

describe("binary objects traversing the Wyrmhole", function() {
    var mockWyrmhole, queenling,
        bufferStr = 'Mg==',
        bufferObj = b64Buffer.decode(bufferStr),
        prop = defaults.newQueenlingProps[2]; // arrayProp

    beforeEach(function() {
        clock.install();

        mockWyrmhole = lifecycle.newMockWyrmhole();
        queenling = lifecycle.getResolvedQueenling(mockWyrmhole);
    });
    afterEach(function() {
        clock.uninstall();
    });

    it("default should send ArrayBuffers by ref", function() {
        queenling.setProperty(prop, bufferObj);
        clock.flush();
        expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, {
            $type: 'ref',
            data: [jasmine.any(Number), jasmine.any(Number)]
        }]);
    });
    it("should send ArrayBuffers as a base64 string if passed as value", function() {
        queenling.setProperty(prop, FireWyrmJS.asVal(bufferObj));
        clock.flush();
        expect(mockWyrmhole.lastOutbound.args).toEqual(['SetP', queenling.spawnId, queenling.objectId, prop, {
            $type: 'binary',
            data: bufferStr,
        }]);
    });
    it("should convert received binary values into ArrayBuffers", function() {
        var getDfd = queenling[prop];
        clock.flush();
        mockWyrmhole.lastOutbound.success({ $type: 'binary', data: bufferStr });
        expect(getDfd).toBeResolvedWith(jasmine.any(ArrayBuffer));

        getDfd = queenling.invoke(prop);
        clock.flush();
        mockWyrmhole.lastOutbound.success({ $type: 'binary', data: bufferStr });
        expect(getDfd).toBeResolvedWith(jasmine.any(ArrayBuffer));
    });
});
