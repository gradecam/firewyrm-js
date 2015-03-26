if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['../../../src/deferred'], function(Deferred) {

    var ConsoleWyrmhole = function() {
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

    return ConsoleWyrmhole;
});
