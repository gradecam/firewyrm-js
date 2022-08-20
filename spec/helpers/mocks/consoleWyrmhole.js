module.exports = ConsoleWyrmhole;

const makeDfd = require('../../../dist/dfd').makeDfd;

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
        var dfd = makeDfd();
        dfds[msgIdCnt] = dfd;
        return dfd.promise;
    };
}
