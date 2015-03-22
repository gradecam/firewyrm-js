if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./deferred'], function(Deferred) {

    return {
        create: function(wyrmHole, mimetype, args) {
            var send = Deferred.fn(wyrmHole, 'sendMessage'),
                objectId = 0,
                spawnId;
            return send(['New', mimetype, args]).then(function(id) {
                spawnId = id;
                return send(['Enum', spawnId, objectId]); // enum the default object
            }).then(function(props) {
                // TODO: return something useful
                return {
                    spawnId: spawnId,
                    objectId: objectId,
                    destroy: function() {
                        return send(['Destroy', spawnId]);
                    }
                };
            });
        }
    };
});
