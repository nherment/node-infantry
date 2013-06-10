

var app = require('express')()
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)

server.listen(80)

app.get('/', function (req, res) {
    res.sendfile(__dirname + '../web/index.html')
})

app.put("/api/node", function(req, res) {

    req.body

})

io.sockets.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' })
    socket.on('my other event', function (data) {
        console.log(data);
    })
})