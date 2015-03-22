if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(['./deferred'], function(Deferred) {

    return {
        create: function() {
            var queenlingDfd = Deferred();
            queenlingDfd.resolve();
            return queenlingDfd.promise;
        }
    };
});
