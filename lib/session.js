
var Session = function(id, socket) {
    this.state = 'init'; //'init', 'auth', 'connecting', 'transfer', 'closed'
    this.id = id;
    this.socket = socket;
    this.listeners = {};

    var self = this;
    socket.on('message', function(data) {
        self.fireEvent('message', data);
    });

    socket.on('close', function() {
        self.close()
    });
};

Session.prototype.send = function(data) {
    if (this.state = 'transfer') {
        this.socket.send(data);
    }
}
/**
*@Param event includes ['message', 'close', 'authenticate', 'remoteConnect'];
**/
Session.prototype.on = function(event, handler) {
    var handlers = this.listeners[event];
    if (handlers == null) {
        handlers = [];
        this.listeners[event] = handlers;
    }

    handlers.push(handler);
}

Session.prototype.fireEvent = function(event, data) {
    var handlers = this.listeners[event];
    if (handlers) {
        for(var i in handlers) {
            var handler = handlers[i];
            handler(data);
        }
    }
}

Session.prototype.close = function() {
    if (this.state != 'close') {
        this.state = 'close';
        this.socket.close();
        this.fireEvent('close');
    }
}

Session.prototype.authenticate = function(data, callback) {
    if (this.state = 'init') {
        this.state = 'auth';

        var tempBuf = new Buffer(2);
        tempBuf.write("\u0005\u0000", 0);

        callback(tempBuf);
        console.log(this.id + ": is authenticated");
    }
}

Session.prototype.remoteConnect = function(data, callback) {
    if (this.state = 'auth') {
        this.state = 'connecting';
        var self = this;
        this.socket.send(data, function(result){
            self.state = 'transfer';
            callback(result);
            console.log(self.id + ': is remote connected');
        });
    }
}

module.exports = Session;

