/* globals jasmine */
var FireWyrmJS = require('../../src/firewyrm');
var MockWyrmHole = require('../../src/mockWyrmHole');
var defaults = require('./defaults');

module.exports = {
    newMockWyrmHole: newMockWyrmHole,
    getResolvedQueenling: getResolvedQueenling,
};


function newMockWyrmHole() {
    var wyrmHole = new MockWyrmHole();
    wyrmHole.flushClockFn = jasmine.clock().flush;
    return wyrmHole;
}

function getResolvedQueenling(wyrmHole, mimetype, args, enumProps) {
    // sanitize args
    wyrmHole = wyrmHole || newMockWyrmHole();
    mimetype = mimetype || defaults.mimetype;
    args = args || defaults.newQueenlingArgs;
    enumProps = enumProps || defaults.newQueenlingProps;

    var queenling = FireWyrmJS.create(wyrmHole, mimetype, args);
    wyrmHole.lastMessage.respond('success', wyrmHole.lastSpawnId); // respond to "New"
    wyrmHole.lastMessage.respond('success', enumProps); // respond to "Enum"
    queenling.then(function(alienWyrmling) {
        queenling = alienWyrmling; // this is the final resolved AlienWyrmling from initial contact
        return alienWyrmling;
    });
    jasmine.clock().flush(); // make sure any promises are resolved
    return queenling;
}
