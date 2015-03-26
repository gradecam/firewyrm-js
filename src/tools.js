/* global toString */
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./deferred'], function(Deferred) {
    return {
        addWyrmlingStore: addWyrmlingStore,
        asVal: asVal,
        defineProperties: defineProperties,
        handleEnum: handleEnum,
        isArray: isArray,
        isFunction: isFunction,
        isNumber: isNumber,
        isPrimitive: isPrimitive,
        isValidMessage: isValidMessage,
        wrapAlienWyrmling: wrapAlienWyrmling,
    };

    function addWyrmlingStore(baseStore, spawnId) {
        var nextId = 1;
        var newStore = {};
        Object.defineProperties(newStore, {
            spawnId: { value: spawnId },
            nextId: { get: function() { return nextId++; } }
        });
        Object.defineProperty(baseStore, 0, { value: newStore });
    }

    function asVal(obj) {
        if (isPrimitive(obj)) { return obj; }
        return { $type: 'json', data: obj };
    }

    // defines provided properties as non-configurable, non-enumerable, non-writable values
    function defineProperties(obj, props) {
        for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
                Object.defineProperty(obj, prop, { value: props[prop] });
            }
        }
    }

    // performs Enum and creates the getters / setters / etc.
    function wrapAlienWyrmling(wyrmhole, wyrmlingStore, spawnId, objectId) {
        var send = Deferred.fn(wyrmhole, 'sendMessage');
        var wyrmling = function() {
            var args = [''].concat(Array.prototype.slice.call(arguments, 0));
            return wyrmling.invoke.apply(wyrmling, args);
        };
        // Add our helper properties
        defineProperties(wyrmling, {
            spawnId: spawnId,
            objectId: objectId,
            getProperty: function(prop) {
                return send(['GetP', spawnId, objectId, prop]);
            },
            setProperty: function(prop, val) {
                val = prepOutboundValue(wyrmlingStore, val);
                return send(['SetP', spawnId, objectId, prop, val]);
            },
            invoke: function(prop) {
                var args = Array.prototype.slice.call(arguments, 1);
                return send(['Invoke', spawnId, objectId, prop, args]);
            }
        });
        return send(['Enum', spawnId, objectId]).then(function(props) {
            for (var i = 0; i < props.length; i++) {
                createProperty(wyrmling, props[i]);
            }
            return wyrmling;
        });
    }

    function createProperty(wyrmling, prop) {
        Object.defineProperty(wyrmling, prop, {
            enumerable: true,
            configurable: false, // don't allow it to be deleted (it isn't ours)
            get: function() {
                return wyrmling.getProperty(prop);
            },
            set: function(val) {
                return wyrmling.setProperty(prop, val);
            }
        });
    }

    // stores this as a localWyrmling, if necessary
    function prepOutboundValue(wyrmlingStore, val) {
        if (isPrimitive(val)) { return val; }
        var id = wyrmlingStore.nextId;
        wyrmlingStore[id] = val;
        return { $type: 'ref', data: [wyrmlingStore.spawnId, id] };
    }

    var validMessages = {
        // lifecycle
        'New': true,
        'Destroy': true,
        'RelObj': true,
        // properties
        'Enum': true,
        'DelP': true,
        'GetP': true,
        'SetP': true,
        'Invoke': true
    };
    function isValidMessage(msg) {
        if (!isArray(msg) || !validMessages[msg[0]]) {
            return false;
        }
        switch (msg[0]) {
            case 'Enum':
                return msg.length === 3 && isNumber(msg[1]) && isNumber(msg[2]);
        }
    }
    function handleEnum(wyrmlingStore, msg, cb) {
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

    // adapted from underscore.js
    var nativeIsArray = Array.isArray;
    function isArray(obj) {
        return nativeIsArray ? Array.isArray(obj) : toString.call(obj) === '[object Array]';
    }

    // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
    // IE 11 (#1621), and in Safari 8 (#1929).
    var optimizeIsFunction = typeof /./ !== 'function' && typeof Int8Array !== 'object';
    function isFunction(obj) {
        if (optimizeIsFunction) {
            return typeof obj === 'function' || false;
        } else {
            return toString.call(obj) === '[object Function]';
        }
    }

    function isNumber(val) {
        return toString.call(val) === '[object Number]' && !isNaN(val);
    }
});
