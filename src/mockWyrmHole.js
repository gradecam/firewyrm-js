if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./fbpromise'], function(Deferred) {
    var MockWyrmHole = function() {
        var self = this;

        self.lastMessage = null;

        self.sendMessage = function(msg, data) {
            self.lastMessage = { message: msg, data: data};
        };
    };

    return MockWyrmHole;
});
