if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./fbpromise'], function(Deferred) {
    var MockWyrmHole = function() {
        var self = this;

        self.lastMessage = {};

        self.sendMessage = function(msg, cb) {
            self.lastMessage = {
                args: msg,
                cb: cb
            };
        };
    };

    return MockWyrmHole;
});
