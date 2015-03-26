var FireWyrmJS = require('../../src/firewyrm');
var MockWyrmhole = require('./mocks/mockWyrmhole');
var clock = require('./clock');
var defaults = require('./defaults');

module.exports = {
    newMockWyrmhole: newMockWyrmhole,
    getResolvedQueenling: getResolvedQueenling,
};


function newMockWyrmhole() {
    return new MockWyrmhole();
}

function getResolvedQueenling(wyrmhole, mimetype, args, enumProps) {
    // sanitize args
    wyrmhole = wyrmhole || newMockWyrmhole();
    mimetype = mimetype || defaults.mimetype;
    args = args || defaults.newQueenlingArgs;
    enumProps = enumProps || defaults.newQueenlingProps;

    var fw = new FireWyrmJS(wyrmhole);
    var queenling = fw.create(mimetype, args);
    wyrmhole.lastOutbound.respond('success', wyrmhole.lastSpawnId); // respond to "New"
    wyrmhole.lastOutbound.respond('success', enumProps); // respond to "Enum"
    queenling.then(function(alienWyrmling) {
        queenling = alienWyrmling; // this is the final resolved AlienWyrmling from initial contact
        return alienWyrmling;
    });
    clock.flush(); // make sure any promises are resolved
    return queenling;
}
