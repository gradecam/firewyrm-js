if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./deferred', './tools'], function(Deferred, tools) {

    return {
        asVal: asVal,
        create: create
    };

    function create(wyrmhole, mimetype, args) {
        var send = Deferred.fn(wyrmhole, 'sendMessage');
        return send(['New', mimetype, args]).then(function(spawnId) {
            return tools.wrapAlienWyrmling(wyrmhole, spawnId, 0);
        }).then(function(queenling) {
            queenling.destroy = function() {
                return send(['Destroy', queenling.spawnId]);
            };
            return queenling;
        });
    }

    function asVal(obj) {
        if (tools.isPrimitive(obj)) { return obj; }
        return { $type: 'json', data: obj };
    }
});
