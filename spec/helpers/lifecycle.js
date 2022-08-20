var FireWyrmJS = require('../../dist/firewyrm').default;
var MockWyrmhole = require('./mocks/mockWyrmhole');
var clock = require('./clock');
var defaults = require('./defaults');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    newMockWyrmhole: newMockWyrmhole,
    getResolvedQueenling: getResolvedQueenling,
};


function newMockWyrmhole() {
    return new MockWyrmhole();
}

async function getResolvedQueenling(wyrmhole, mimetype, args, enumProps) {
    // sanitize args
    wyrmhole = wyrmhole || newMockWyrmhole();
    mimetype = mimetype || defaults.mimetype;
    args = args || defaults.newQueenlingArgs;
    enumProps = enumProps || defaults.newQueenlingProps;

    var fw = new FireWyrmJS(wyrmhole);
    await delay(0); // wait for "New" to be processed
    
    wyrmhole.queueResponse('New', wyrmhole.lastSpawnId);
    wyrmhole.queueResponse('Enum', enumProps);
    var queenling = fw.create(mimetype, args);

    queenling.then(function(alienWyrmling) {
        queenling = alienWyrmling; // this is the final resolved AlienWyrmling from initial contact
        return alienWyrmling;
    });
    
    await delay(0); // wait for the queenling to be resolved
    clock.flush(); // make sure any promises are resolved
    return queenling;
}
