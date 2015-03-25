var FireWyrmJS = require('../../src/firewyrm');
var MockWyrmHole = require('./mocks/mockWyrmHole');
var clock = require('./clock');
var defaults = require('./defaults');

module.exports = {
    newMockWyrmHole: newMockWyrmHole,
    getResolvedQueenling: getResolvedQueenling,
};


function newMockWyrmHole() {
    return new MockWyrmHole();
}

function getResolvedQueenling(wyrmHole, mimetype, args, enumProps) {
    // sanitize args
    wyrmHole = wyrmHole || newMockWyrmHole();
    mimetype = mimetype || defaults.mimetype;
    args = args || defaults.newQueenlingArgs;
    enumProps = enumProps || defaults.newQueenlingProps;

    var queenling = FireWyrmJS.create(wyrmHole, mimetype, args);
    wyrmHole.lastOutbound.respond('success', wyrmHole.lastSpawnId); // respond to "New"
    wyrmHole.lastOutbound.respond('success', enumProps); // respond to "Enum"
    queenling.then(function(alienWyrmling) {
        queenling = alienWyrmling; // this is the final resolved AlienWyrmling from initial contact
        return alienWyrmling;
    });
    clock.flush(); // make sure any promises are resolved
    return queenling;
}
