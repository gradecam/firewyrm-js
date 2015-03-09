/*globals WeakMap*/
if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./fbpromise', './consoleWyrmHole', './mockWyrmHole'], function(Deferred, ConsoleWyrmHole, MockWyrmHole) {

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
                return wyrmHole.sendMessage(['Invoke', self.objectId, fnName, args]);
            };
        });

        self.pList.forEach(function(pName) {
            self.__defineGetter__(pName, function() {
                return wyrmHole.sendMessage(['GetP', objectId, pName]);
            });
            self.__defineSetter__(pName, function(val) {
                return wyrmHole.sendMessage(['SetP', objectId, pName, val]);
            });
        });

    };


    function getRootObject(wyrmHole) {
        return wyrmHole.sendMessage(['DescribeObj', 0]);
    }

    return {
        WyrmJSAPI: WyrmJSAPI,
        getRootObject: getRootObject
    };
});
