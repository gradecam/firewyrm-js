/* global toString */
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./deferred'], function(Deferred) {
    return {
        wrapAlienWyrmling: wrapAlienWyrmling,
        isPrimitive: isPrimitive,
        isFunction: isFunction
    };

    // performs Enum and creates the getters / setters / etc.
    function wrapAlienWyrmling(wyrmhole, spawnId, objectId) {
        var send = Deferred.fn(wyrmhole, 'sendMessage');
        var wyrmling = {
            spawnId: spawnId,
            objectId: objectId,
            getProperty: function(prop) {
                return send(['GetP', spawnId, objectId, prop]);
            },
            setProperty: function(prop, val) {
                return send(['SetP', spawnId, objectId, prop, val]);
            },
            invoke: function(prop) {
                var args = Array.prototype.slice.call(arguments, 1);
                return send(['Invoke', spawnId, objectId, prop, args]);
            }
        };
        return send(['Enum', spawnId, objectId]).then(function(props) {
            var prop;
            for (var i = 0; i < props.length; i++) {
                prop = props[i];
                Object.defineProperty(wyrmling, prop, createPropertyDefinition(wyrmling, prop));
            }
            return wyrmling;
        });
    }

    function createPropertyDefinition(wyrmling, prop) {
        return {
            writable: true,
            enumerable: true,
            configurable: false, // don't allow it to be deleted (it isn't ours)
            get function() {
                return wyrmling.getProperty(prop);
            },
            set function(val) {
                return wyrmling.setProperty(prop, val);
            }
        };
    }

    function isPrimitive(val) {
        if (val === null) { return true; } // to avoid false positive on typeof 'object' test below
        switch (typeof val) {
            case 'object':
            case 'function':
            case 'symbol':
                return false;
            default:
                return true;
        }
    }
});
