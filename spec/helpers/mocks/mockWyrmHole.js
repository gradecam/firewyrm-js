if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['../../../src/deferred', '../clock'], function(Deferred, clock) {
    var id = 0;
    var MockWyrmHole = function() {
        var self = this;
        self.lastSpawnId = ++id;
        self.lastOutbound = {
            respond: function() {}
        };

        // called by FireWyrmJS when it wants to send messages to the other side
        self.sendMessage = function(msg, cb) {
            self.lastOutbound = {
                args: msg,
                cb: cb,
                respond: function() {
                    cb.apply(null, arguments);
                    clock.flush(); // process any resulting promises / timeouts if our mock clock is installed
                }
            };
        };
    };

    return MockWyrmHole;
});
