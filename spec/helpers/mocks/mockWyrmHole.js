if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['../../../src/deferred', '../clock'], function(Deferred, clock) {
    var id = 0;
    var MockWyrmHole = function() {
        var self = this;
        self.lastSpawnId = ++id;
        self.lastOutbound = {
            respond: function() {}
        };
        self.lastInbound = {};

        // called by FireWyrmJS when it wants to send messages to the other side
        self.sendMessage = function(msg, cb) {
            self.lastOutbound = {
                args: msg,
                cb: cb,
                respond: function() {
                    cb.apply(null, arguments);
                    clock.flush(); // process any resulting promises / timeouts if our mock clock is installed
                },
                success: function(val) {
                    cb.call(null, 'success', val);
                    clock.flush();
                },
                error: function(errorType, errorMsg) {
                    cb.call(null, 'error', { error: errorType, message: errorMsg });
                    clock.flush();
                },
            };
        };

        // called by FireWyrmJS so it can receive messages from the other side
        self.onMessage = function(fn) { // fn expects (message, cb)
            msgHandler = fn;
        };
        var msgHandler; // handles messages coming from the other side into FireWyrmJS


        // so we can fake messages from the other side
        self.triggerInbound = function(msg) {
            if (!msgHandler) { return; }
            var inbound = {
                args: msg,
                status: (void 0),
                response: (void 0)
            };
            self.lastInbound = inbound;
            setTimeout(function() {
                msgHandler(msg, function(status, resp) {
                    inbound.status = status;
                    inbound.response = resp;
                });
            }, 0);

            // give firewyrm a chance to respond
            clock.flush();
        };
    };

    return MockWyrmHole;
});
