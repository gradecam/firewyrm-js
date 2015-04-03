module.exports = ConsoleWyrmhole;

var Deferred = require('../../../src/deferred');
function ConsoleWyrmhole() {
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
}
