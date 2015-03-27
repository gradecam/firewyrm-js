if (typeof define !== 'function') { var define = require('amdefine')(module); }
'use strict';
define(['./deferred', './tools'], function(Deferred, tools) {
    FireWyrmJS.asVal = tools.asVal;
    return FireWyrmJS;

    function FireWyrmJS(wyrmhole) {
        var self = this;
        tools.defineProperties(self, {
            asVal: tools.asVal,
            create: create,
            registerObjectType: register,
            wyrmhole: wyrmhole
        });
        var supportedTypes = {}; // things for which we'll respond to 'New'

        var baseWyrmlingStore = {};
        tools.addWyrmlingStore(baseWyrmlingStore, 0); // will be used when objects are sent via queenling (e.g. queenling.doSomethingWith(myObj))

        wyrmhole.onMessage(function(msg, cb) {
            tools.handleMessage(wyrmhole, baseWyrmlingStore, supportedTypes, msg, cb);
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

        /**
         * Returns a promise that resolves to undefined if the registration was
         * successful or rejects if invalid parameters were provided.
         *
         * @param type {String} which 'New' messages should be handled, e.g. 'application/myApp'
         * @param factoryFn {Function} Called when a matching 'New' is received over the Wyrmhole.
         *   Invoked with a parameters object; must return object.
         *
         *   The object returned may optionally specify an `_onDestroy` function, which will
         *   be called when we receive 'Destroy' from the Wyrmhole.
         */
        function register(type, factoryFn) {
            return Deferred.when(factoryFn).then(function(factory) {
                if (!type || typeof(type) !== 'string') {
                    return Deferred.reject('Must provide a valid object type, e.g. application/myApp');
                } else if (!tools.isFunction(factory)) {
                    return Deferred.reject('Must provide a function to invoke when a new instance is requested');
                }
                supportedTypes[type] = factory;
            });
        }
    }
});
