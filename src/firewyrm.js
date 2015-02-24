/*globals WeakMap*/
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./fbpromise'], function(Deferred) {
    function blah() {
        console.log("BLAH!");
    }

    var ConsoleWyrmHole = function() {
        var msgIdCnt = 0;
        var dfds = {};

        this.sendMessage = function(msg, data) {
            var msgObj = {
                message: msg,
                messageId: ++msgIdCnt,
                data: data
            };
            console.log('sendMessage: ', msgObj);
            var dfd = new Deferred();
            dfds[msgIdCnt] = dfd;
            return dfd.promise;
        };
    };

    var objectIdWeakMap = new WeakMap();
    var objectIdMap = {};

    function serializeValue(value) {
        if (typeof value !== 'object') { return value; } // Only objects get translated
        if(!objectIdWeakMap.has(value)) {
            var id = Number(('' + Math.random()).slice(2));
            objectIdMap[id] = value;
            objectIdWeakMap.set(value, id);
        }
        return objectIdWeakMap.get(value);
    }
    function deserializeValue(value) {
        if (typeof value !== 'object') { return value; } // Only objects get translated
        return objectIdMap[value.objectId] || value;
    }


    var WyrmJSAPI = function(objectId, fnList, pList, name, wyrmHole) {
        var self = this;

        self.objectId = objectId || 0;
        self.fnList = fnList || [];
        self.pList = pList || [];
        self.name = name || '';

        self.toString = function() {
            return "[WyrmJSAPI Object: " + this.name + "]";
        };

        self.fnList.forEach(function(fnName) {
            self[fnName] = function() {
                var args = Array.prototype.map.call(arguments, function(arg) { return serializeValue(arg); });
                return wyrmHole.sendMessage('CallFn', {
                    objectId: self.objectId,
                    fnName: fnName,
                    args: arguments
                });
            };
        });

        self.pList.forEach(function(pName) {
            self.__defineGetter__(pName, function() {
                return wyrmHole.sendMessage('GetP', {
                    objectId: self.objectId,
                    pName: pName
                });
            });
            self.__defineSetter__(pName, function(val) {
                return wyrmHole.sendMessage('SetP', {
                    objectId: self.objectId,
                    pName: pName,
                    value: val
                });
            });
        });

    };


    function getRootObject(wyrmHole) {
        var rootAPI = new WyrmJSAPI(0, ['getRootObject'],[], 'rootAPI', wyrmHole);
        return rootAPI.getRootObject();
    }

    return {
        WyrmJSAPI: WyrmJSAPI,
        ConsoleWyrmHole: ConsoleWyrmHole
    };
});
