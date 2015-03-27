if (typeof define !== 'function') { var define = require('amdefine')(module); }
'use strict';
define(['./deferred', './tools'], function(Deferred, tools) {
    FireWyrmJS.asVal = tools.asVal;
    return FireWyrmJS;

    function FireWyrmJS(wyrmhole) {
        var self = this;
        tools.defineProperties(self, {
            wyrmhole: wyrmhole,
            create: create,
            asVal: tools.asVal,
        });
        var baseWyrmlingStore = {};
        tools.addWyrmlingStore(baseWyrmlingStore, 0); // will be used when objects are sent via queenling (e.g. queenling.doSomethingWith(myObj))

        wyrmhole.onMessage(function(msg, cb) {
            tools.handleMessage(wyrmhole, baseWyrmlingStore, msg, cb);
        });

        function create(mimetype, args) {
            var wyrmlingStore = baseWyrmlingStore[0];

            // Create and resolve the queenling
            var send = Deferred.fn(wyrmhole, 'sendMessage');
            return send(['New', mimetype, args]).then(function(spawnId) {
                return tools.wrapAlienWyrmling(wyrmhole, wyrmlingStore, spawnId, 0);
            }).then(function(queenling) {
                tools.defineProperties(queenling, {
                    destroy: function() {
                        return send(['Destroy', queenling.spawnId]);
                    }
                });
                return queenling;
            }, function(error) {
                //console.warn("CREATE ERROR:", error);
                return Deferred.reject(error);
            });
        }
    }
});
