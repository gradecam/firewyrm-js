module.exports = MockWyrmhole;

var clock = require('../clock');
var id = 0;

function MockWyrmhole() {
    var self = this;
    self.lastSpawnId = ++id;
    self.outbound = [];
    self.lastOutbound = {
        respond: function() {}
    };
    self.lastInbound = {};

    const responseQueue = {};

    self.queueResponse = function(msg, response) {
        if (!responseQueue[msg]) {
            responseQueue[msg] = [];
        }
        responseQueue[msg].push(response);
    };

    // called by FireWyrmJS when it wants to send messages to the other side
    self.sendMessage = async function(msg) {
        const response = responseQueue[msg] && responseQueue[msg].shift();
        if (!response) { throw new Error(`No response queued for ${msg}`); }
        
        if (response instanceof Error) {
            throw response;
        } else {
            return response;
        }
    };
    self.getOutbound = function(index) {
        return self.outbound.slice(index, index === -1 ? (void 0) : index+1)[0];
    };

    // called by FireWyrmJS so it can receive messages from the other side
    self.onMessage = function(fn) { // fn expects (message)
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
            msgHandler(msg).then(value => {
                inbound.status = 'success';
                inbound.response = resp;
            }, error => {
                inbound.status = 'error';
                inbound.response = error;
            });
        }, 0);

        // give firewyrm a chance to respond
        clock.flush();
    };
};
