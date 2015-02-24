/* globals angular */
function blah() {
    console.log("BLAH!");
}

var ConsoleWormHole = function() {
    var msgIdCnt = 0;
    var dfds = {};

    this.sendMessage = function(msg, data) {
        var msgObj = {
            message: msg,
            messageId: ++msgIdCnt,
            data: data
        };
        console.log('sendMessage: ', msgObj);
        var dfd = new $.Deferred();
        dfds[msgIdCnt] = dfd;
        return dfd.promise();
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


var WyrmJSAPI = function(objectId, fnList, pList, name, wormHole) {
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
            var args = arguments.map(function(arg) { return serializeValue(arg); });
            return wormHole.sendMessage('CallFn', {
                objectId: self.objectId,
                fnName: fnName,
                args: arguments
            });
        };
    });

    self.pList.forEach(function(pName) {
        self.__defineGetter__(pName, function() {
            return wormHole.sendMessage('GetP', {
                objectId: self.objectId,
                pName: pName
            });
        });
        self.__defineSetter__(pName, function(val) {
            return wormHole.sendMessage('SetP', {
                objectId: self.objectId,
                pName: pName,
                value: val
            });
        });
    });

};


function getRootObject(wormHole) {
    var rootAPI = new WyrmJSAPI(0, ['getRootObject'],[], 'rootAPI', wormHole);
    return rootAPI.getRootObject();
}

