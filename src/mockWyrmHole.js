if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./fbpromise'], function(Deferred) {
    var MockWyrmHole = function() {
        var self = this;

        self.lastMessage = null;

        self.sendMessage = function(msg) {
            self.lastMessage = msg;
        };
    };

    return MockWyrmHole;
});
