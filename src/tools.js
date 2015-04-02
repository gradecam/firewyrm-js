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
        isNumber: isNumber,
        isObject: isObject,
        retainAllWyrmlings: retainAllWyrmlings,
        wrapAlienWyrmling: wrapAlienWyrmling,
    };

    function addWyrmlingStore(baseStore, spawnId, rootObject) {
        var nextId = 1;
        var newStore = {};
        Object.defineProperties(newStore, {
            baseStore: { value: baseStore },
            spawnId: { value: spawnId },
            destroy: { value: function() {
                Object.keys(newStore).forEach(function(objectId) {
                    newStore.releaseObject(objectId);
                });
                delete baseStore[spawnId];
            }},
            getObject: { value: function(objectId) {
                return newStore[objectId] && newStore[objectId][0];
            }},
            putObject: { value: function(obj) {
                var id = nextId++;
                newStore[id] = [obj];
                return id;
            }},
            releaseObject: { value: function(objectId) {
                var wyrmlingProperties = newStore.getWyrmlingProperties(objectId);
                Object.keys(wyrmlingProperties).forEach(function(prop) {
                    wyrmlingProperties[prop].release();
                });
                clearInterval(wyrmlingProperties.__timer);
                wyrmlingProperties.__timer = null;
                delete newStore[objectId];
            }},
            setObjectProperty: { value: function(objectId, prop, val) {
                var obj = newStore.getObject(objectId);
                var wyrmlingProperties = newStore.getWyrmlingProperties(objectId);
                if (wyrmlingProperties[prop]) {
                    wyrmlingProperties[prop].release();
                    delete wyrmlingProperties[prop];
                }
                obj[prop] = val;
                if (isWyrmling(val)) {
                    wyrmlingProperties[prop] = val;
                    val.retain();
                }
                var wyrmPropKeys = Object.keys(wyrmlingProperties).length;
                if (wyrmPropKeys === 0 && wyrmlingProperties.__timer) {
                    clearInterval(wyrmlingProperties.__timer);
                    wyrmlingProperties.__timer = null;
                } else if (wyrmPropKeys && !wyrmlingProperties.__timer) {
                    wyrmlingProperties.__timer = setInterval(function() {
                        for (var prop in wyrmlingProperties) {
                            if (wyrmlingProperties.hasOwnProperty(prop)) {
                                newStore.setObjectProperty(objectId, prop, obj[prop]);
                            }
                        }
                    }, 5000);
                }
            }},
            getWyrmlingProperties: { value: function(objectId) {
                var arr = newStore[objectId];
                if (!isArray(arr)) { return {}; }
                if (isObject(arr[1])) { return arr[1]; }
                var wyrmlingProperties = {};
                Object.defineProperty(wyrmlingProperties, '__timer', {
                    value: null,
                    writable: true
                });
                arr[1] = wyrmlingProperties;
                return wyrmlingProperties;
            }}
        });
        Object.defineProperty(baseStore, spawnId, { value: newStore, configurable: true });
        if (rootObject !== (void 0)) {
            newStore[0] = [rootObject];
        }
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
        var refCount = 0;
        var send = function(args) {
            wyrmling.retain();
            var dfd = Deferred();
            var callback = function(status, resp) {
                if (status === 'success') { dfd.resolve(resp); }
                else { dfd.reject(resp); }
                wyrmling.release();
            };
            wyrmhole.sendMessage(args, callback);
            return dfd.promise;
        };
        var wyrmling = function() {
            var args = [''].concat(Array.prototype.slice.call(arguments, 0));
            return wyrmling.invoke.apply(wyrmling, args);
        };
        var wyrmlingProperties = {};
        Object.defineProperty(wyrmlingProperties, '__timer', { value: null, writable: true });
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
                        if (isWyrmling(getPropVal)) {
                            getPropVal.retain();
                            var invokePromise = getPropVal.apply(null, args);
                            Deferred.always(invokePromise, function() { getPropVal.release(); });
                            return invokePromise;
                        } else {
                            return Deferred.reject({ error: 'could not invoke', message: 'The object is not invokable' });
                        }
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
            },
            retain: function() {
                refCount++;
            },
            release: function() {
                refCount--;
                if (objectId === 0) { return; } // queenlings must be manually destroyed
                setTimeout(function() { if (!refCount) {
                    send(['RelObj', spawnId, objectId]);
                }}, 10);
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
            if (isPrimitive(v) || v.$type === 'json' || v.$type === 'binary' || v.$type === 'error') {
                return v;
            }
            if (v.$type === 'one-level') {
                for (var prop in v.data) {
                    if (v.data.hasOwnProperty(prop)) {
                        v.data[prop] = prepOutboundValue(wyrmlingStore, v.data[prop]);
                    }
                }
                return Deferred.all(v.data);
            }
            // this is an object we need to send by reference; store and send
            var objectId = wyrmlingStore.putObject(v);
            return { $type: 'ref', data: [wyrmlingStore.spawnId, objectId] };
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
        return Deferred.when(val).then(function() {
            if (isPrimitive(val)) { return val; }
            if (val.$type === 'local-ref') {
                var store = wyrmlingStore.baseStore;
                if (store[val.data[0]] && val.data[1] in store[val.data[0]]) {
                    return store[val.data[0]].getObject(val.data[1]);
                }
                return (void 0); // bad local-ref, receiver has to just deal with it
            }
            if (val.$type === 'ref') {
                return wrapAlienWyrmling(wyrmhole, wyrmlingStore, val.data[0], val.data[1]);
            }
            if (val.$type === 'json') {
                return val.data;
            }
            if (val.$type === 'binary') {
                return b64Buffer.decode(val.data);
            }

            // This must be an object, so recursively make it magical. Since any property could
            // be a wyrmling, retain them until everything is ready so autorelease doesn't kick
            // in if another wyrmling happens to take a long time to get back from Enum, etc.
            var wyrmlings = [];
            function retainIfWyrmling(v) {
                if (isWyrmling(v)) {
                    v.retain();
                    wyrmlings.push(v);
                }
                return v;
            }
            for (var prop in val) {
                if (val.hasOwnProperty(prop)) {
                    val[prop] = prepInboundValue(wyrmhole, wyrmlingStore, val[prop]).then(retainIfWyrmling);
                }
            }
            var allFinishedPromise = Deferred.all(val);
            Deferred.always(allFinishedPromise, function() {
                // everything is ready now, so get the release flow back on track
                wyrmlings.forEach(function(ling) { ling.release(); });
            });
            return allFinishedPromise;
        });
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
        return msg[2] in wyrmlingStore ? wyrmlingStore.getObject(msg[2]) : null;
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
            case 'SetP': return handleSetP(wyrmhole, store, obj, msg[2], msg[3], msg[4], cb);
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
            addWyrmlingStore(baseWyrmlingStore, spawnId, princessling);
            cb('success', spawnId);
        } catch(error) {
            cb('error', { error: 'could not create object', message: error && error.message || 'There was an unidentified error creating the object'});
        }
    }
    function handleDestroy(baseWyrmlingStore, supportedTypes, msg, cb) {
        var spawnId = msg[1];
        if (!baseWyrmlingStore[spawnId] || !baseWyrmlingStore[spawnId].getObject(0)) {
            return cb('error', { error: 'could not destroy object', message: 'The object does not exist' });
        }
        try {
            var princessling = baseWyrmlingStore[spawnId].getObject(0);
            baseWyrmlingStore[spawnId].destroy();
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
    function handleSetP(wyrmhole, wyrmlingStore, obj, objectId, prop, val, cb) {
        if (!obj.hasOwnProperty(prop)) {
            return cb('error', { error: 'could not set property', message: 'Property does not exist on this object' });
        }
        prepInboundValue(wyrmhole, wyrmlingStore, val).then(function(v) {
            try {
                wyrmlingStore.setObjectProperty(objectId, prop, v);
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
        wyrmlingStore.releaseObject(objectId);
        cb('success', null);
    }
    function handleInvoke(wyrmhole, wyrmlingStore, obj, prop, args, cb) {
        var retVal, promises = [];
        if (prop) {
            if (!obj.hasOwnProperty(prop)) {
                return cb('error', { error: 'could not invoke property', message: 'Property does not exist on this object' });
            } else if (!isFunction(obj[prop])) {
                return cb('error', { error: 'could not invoke property', message: 'Property is not callable' });
            }
            args.forEach(function(arg) {
                promises.push(prepInboundValue(wyrmhole, wyrmlingStore, arg));
            });
            retVal = Deferred.all(promises).then(function(args) {
                return obj[prop].apply(obj, args);
            });
        }
        else {
            if (!isFunction(obj)) {
                return cb('error', { error: 'could not invoke object', message: 'Object is not callable' });
            }
            args.forEach(function(arg) {
                promises.push(prepInboundValue(wyrmhole, wyrmlingStore, arg));
            });
            retVal = Deferred.all(promises).then(function(args) {
                return obj.apply(null, args);
            });
        }
        return Deferred.when(retVal).then(function(val) {
            return prepOutboundValue(wyrmlingStore, val).then(function(v) {
                if (v && v.$type === 'error') {
                    return cb('error', v.data);
                }
                return cb('success', v);
            });
        }, function(error) {
            var type = prop ? 'property' : 'object';
            return cb('error', { error: 'could not invoke ' + type, message: error || 'There was an unidentified error calling the ' + type });
        });
    }

    function findWyrmlings(thing) {
        var wyrmlings = [];
        if (isWyrmling(thing)) {
            return [thing];
        } else if (isArray(thing) || isObject(thing)) {
            for (var prop in thing) {
                if (thing.hasOwnProperty(prop)) {
                    wyrmlings = wyrmlings.concat(findWyrmlings(thing[prop]));
                }
            }
        }
        return wyrmlings;
    }
    function retainAllWyrmlings(thing) {
        var wyrmlings = findWyrmlings(thing);
        wyrmlings.forEach(function(ling) { ling.retain(); });
        return function() {
            wyrmlings.forEach(function(ling) { ling.release(); });
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
    // match plain objects, not special things like null or ArrayBuffer
    function isObject(val) { return val && toString.call(val) === '[object Object]'; }
    function isString(val) { return typeof(val) === 'string'; }
    function isWyrmling(val) {
        return isFunction(val) &&
               val.hasOwnProperty('spawnId') &&
               val.hasOwnProperty('objectId') &&
               val.hasOwnProperty('getProperty') &&
               val.hasOwnProperty('setProperty') &&
               val.hasOwnProperty('invoke');
    }
});
