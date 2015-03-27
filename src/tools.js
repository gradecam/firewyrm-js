/* global toString */
'use strict';
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./deferred', '../node_modules/base64-arraybuffer'], function(Deferred, b64Buffer) {
    var validMessages = {'New':true, 'Destroy':true, 'RelObj':true, 'Enum':true, 'DelP':true, 'GetP':true, 'SetP':true, 'Invoke':true};

    return {
        addWyrmlingStore: addWyrmlingStore,
        asVal: asVal,
        defineProperties: defineProperties,
        handleMessage: handleMessage,
        isArray: isArray,
        isFunction: isFunction,
        wrapAlienWyrmling: wrapAlienWyrmling,
    };

    function addWyrmlingStore(baseStore, spawnId) {
        var nextId = 1;
        var newStore = {};
        Object.defineProperties(newStore, {
            spawnId: { value: spawnId },
            nextId: { get: function() { return nextId++; } }
        });
        Object.defineProperty(baseStore, spawnId, { value: newStore, configurable: true });
        return newStore;
    }

    function asVal(obj) {
        if (isPrimitive(obj)) { return obj; }
        if (obj instanceof ArrayBuffer) {
            return { $type: 'binary', data: b64Buffer.encode(obj) };
        }
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
                var getPropVal;
                var getPromise = send(['GetP', spawnId, objectId, prop]).then(function(val) {
                    return prepInboundValue(wyrmhole, wyrmlingStore, val);
                }).then(function(val) {
                    getPropVal = val;
                    return val;
                });
                function magicalFn() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    return getPromise.then(function() {
                        return isFunction(getPropVal) ?
                            getPropVal.apply(null, args) :
                            Deferred.reject({ error: 'could not invoke', message: 'The object is not invokable' });
                    });
                }
                magicalFn.then = getPromise.then;
                return magicalFn;
            },
            setProperty: function(prop, val) {
                return prepOutboundValue(wyrmlingStore, val).then(function(v) {
                    return send(['SetP', spawnId, objectId, prop, v]);
                });
            },
            invoke: function(prop) {
                var args = Array.prototype.slice.call(arguments, 1);
                return prepOutboundArguments(wyrmlingStore, args).then(function(args) {
                    return send(['Invoke', spawnId, objectId, prop, args]);
                }).then(function(val) {
                    return prepInboundValue(wyrmhole, wyrmlingStore, val);
                });
            }
        });
        return send(['Enum', spawnId, objectId]).then(function(props) {
            for (var i = 0; i < props.length; i++) {
                try {
                    createProperty(wyrmling, props[i]);
                } catch(e) {
                    //console.warn("Could not create property " + props[i] + ":", e);
                }
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
        return Deferred.when(val).then(function(v) {
            if (isPrimitive(v) || v.$type === 'json' || v.$type === 'binary') {
                return v;
            }
            var id = wyrmlingStore.nextId;
            wyrmlingStore[id] = v;
            return { $type: 'ref', data: [wyrmlingStore.spawnId, id] };
        });
    }
    // returns after prepOutboundValue has resolved for each arg
    function prepOutboundArguments(wyrmlingStore, args) {
        return Deferred.when(args).then(function(rargs) {
            if (!isArray(rargs) || !rargs.length) { return []; }
            var toResolve = args.map(function(val) {
                return prepOutboundValue(wyrmlingStore, val).then(function(v) {
                    return v;
                });
            });
            return Deferred.all(toResolve);
        });
    }
    function prepInboundValue(wyrmhole, wyrmlingStore, val) {
        if (isPrimitive(val)) { return Deferred.when(val); }
        if (val.$type === 'ref') {
            return wrapAlienWyrmling(wyrmhole, wyrmlingStore, val.data[0], val.data[1]);
        }
        if (val.$type === 'json') {
            return Deferred.when(val.data);
        }
        if (val.$type === 'binary') {
            return b64Buffer.decode(val.data);
        }
        // this must be an object, so recursively make it magical
        for (var prop in val) {
            if (val.hasOwnProperty(prop)) {
                val[prop] = prepInboundValue(wyrmhole, wyrmlingStore, val[prop]);
            }
        }
        return Deferred.all(val);
    }

    function isValidMessage(msg) {
        if (!isArray(msg) || !validMessages[msg[0]]) {
            return false;
        }
        switch (msg[0]) {
            case 'Destroy':
                return msg.length === 2 && isNumber(msg[1]);
            case 'New':
                return msg.length === 3 && msg[1] && isString(msg[1]);
            case 'Enum':
            case 'RelObj':
                return msg.length === 3 && isNumber(msg[1]) && isNumber(msg[2]);
            case 'DelP':
            case 'GetP':
                return msg.length === 4 && isNumber(msg[1]) && isNumber(msg[2]) && isString(msg[3]);
            case 'SetP':
                return msg.length === 5 && isNumber(msg[1]) && isNumber(msg[2]) && isString(msg[3]);
            case 'Invoke':
                return msg.length === 5 && isNumber(msg[1]) && isNumber(msg[2]) && isString(msg[3]) && isArray(msg[4]);
        }
    }
    function getWyrmlingStoreForMessage(baseWyrmlingStore, msg) {
        return msg[1] in baseWyrmlingStore ? baseWyrmlingStore[msg[1]] : {};
    }
    function getObject(wyrmlingStore, msg) {
        return msg[2] in wyrmlingStore ? wyrmlingStore[msg[2]] : null;
    }
    function handleMessage(wyrmhole, baseWyrmlingStore, supportedTypes, msg, cb) {
        if (!isValidMessage(msg)) {
            return cb('error', { error: 'invalid message', message: 'Message was malformed'});
        }
        if (msg[0] === 'New') {
            return handleNew(baseWyrmlingStore, supportedTypes, msg, cb);
        } else if (msg[0] === 'Destroy') {
            return handleDestroy(baseWyrmlingStore, supportedTypes, msg, cb);
        }

        var store = getWyrmlingStoreForMessage(baseWyrmlingStore, msg);
        var obj = getObject(store, msg);
        if (obj === null) {
            return cb('error', { error: 'invalid object', message: 'The object does not exist'});
        }
        switch (msg[0]) {
            case 'Enum': return handleEnum(obj, cb);
            case 'DelP': return handleDelP(store, obj, msg[3], cb);
            case 'GetP': return handleGetP(store, obj, msg[3], cb);
            case 'SetP': return handleSetP(wyrmhole, store, obj, msg[3], msg[4], cb);
            case 'RelObj': return handleRelObj(store, msg[2], cb);
            case 'Invoke': return handleInvoke(wyrmhole, store, obj, msg[3], msg[4], cb);
        }
    }
    function handleNew(baseWyrmlingStore, supportedTypes, msg, cb) {
        if (!(msg[1] in supportedTypes)) {
            return cb('error', { error: 'invalid object type', message: 'Object type ' + msg[1] + ' is not supported' });
        }
        try {
            var princessling = supportedTypes[msg[1]](msg[2] || {});
            baseWyrmlingStore.nextId = baseWyrmlingStore.nextId || 1;
            var spawnId = baseWyrmlingStore.nextId++;
            var wyrmlingStore = addWyrmlingStore(baseWyrmlingStore, spawnId);
            wyrmlingStore[0] = princessling;
            cb('success', spawnId);
        } catch(error) {
            cb('error', { error: 'could not create object', message: error && error.message || 'There was an unidentified error creating the object'});
        }
    }
    function handleDestroy(baseWyrmlingStore, supportedTypes, msg, cb) {
        var spawnId = msg[1];
        if (!baseWyrmlingStore[spawnId] || !baseWyrmlingStore[spawnId][0]) {
            return cb('error', { error: 'could not destroy object', message: 'The object does not exist' });
        }
        try {
            var princessling = baseWyrmlingStore[spawnId][0];
            delete baseWyrmlingStore[spawnId];
            if (isFunction(princessling._onDestroy)) {
                princessling._onDestroy();
            }
            cb('success', spawnId);
        } catch(error) {
            cb('error', { error: 'could not destroy object', message: error && error.message || 'There was an unidentified error creating the object'});
        }
    }
    function handleEnum(obj, cb) {
        var props = [];
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) && prop[0] !== '_') {
                props.push(prop);
            }
        }
        // add special "length" property for arrays and functions
        if (isArray(obj) || isFunction(obj)) {
            props.push('length');
        }
        return cb('success', props);
    }
    function handleDelP(wyrmlingStore, obj, prop, cb) {
        if (!obj.hasOwnProperty(prop)) {
            return cb('error', { error: 'could not delete property', message: 'Property does not exist on this object' });
        }
        try {
            delete obj[prop];
            cb('success', null);
        } catch(error) {
            cb('error', { error: 'could not delete property', message: error && error.message || 'There was an unidentified error deleting the property'});
        }
    }
    function handleGetP(wyrmlingStore, obj, prop, cb) {
        if (!obj.hasOwnProperty(prop) && !(prop === 'length' && (isArray(obj) || isFunction(obj)))) {
            return cb('error', { error: 'could not get property', message: 'Property does not exist on this object' });
        }
        prepOutboundValue(wyrmlingStore, obj[prop]).then(function(val) {
            cb('success', val);
        });
    }
    function handleSetP(wyrmhole, wyrmlingStore, obj, prop, val, cb) {
        if (!obj.hasOwnProperty(prop)) {
            return cb('error', { error: 'could not set property', message: 'Property does not exist on this object' });
        }
        prepInboundValue(wyrmhole, wyrmlingStore, val).then(function(v) {
            try {
                obj[prop] = v;
                cb('success', null);
            } catch(error) {
                cb('error', { error: 'could not set property', message: error && error.message || 'There was an unidentified error deleting the property'});
            }
        }, function(error) {
            cb('error', { error: 'could not set property', message: error || 'There was an unidentified error setting the property' });
        });
    }
    function handleRelObj(wyrmlingStore, objectId, cb) {
        if (objectId === 0) { return; } // root objects cannot be released, they must be destroyed
        delete wyrmlingStore[objectId];
        cb('success', null);
    }
    function handleInvoke(wyrmhole, wyrmlingStore, obj, prop, args, cb) {
        var retVal;
        if (prop) {
            if (!obj.hasOwnProperty(prop)) {
                return cb('error', { error: 'could not invoke property', message: 'Property does not exist on this object' });
            } else if (!isFunction(obj[prop])) {
                return cb('error', { error: 'could not invoke property', message: 'Property is not callable' });
            }
            // TODO: this needs to use prepInboundValue and wait for them all to be finished up
            retVal = obj[prop].apply(obj, args);
        }
        else {
            if (!isFunction(obj)) {
                return cb('error', { error: 'could not invoke object', message: 'Object is not callable' });
            }
            // TODO: this needs to use prepInboundValue and wait for them all to be finished up
            retVal = obj.apply(null, args);
        }
        return Deferred.when(retVal).then(function(val) {
            return prepOutboundValue(wyrmlingStore, val).then(function(v) {
                cb('success', v);
            });
        }, function(error) {
            var type = prop ? 'property' : 'object';
            return cb('error', { error: 'could not invoke ' + type, message: error || 'There was an unidentified error calling the ' + type });
        });
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

    function isNumber(val) { return toString.call(val) === '[object Number]' && !isNaN(val); }
    function isString(val) { return typeof(val) === 'string'; }
});
