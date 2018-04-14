const express = require('express');
const app = express();
const http = require('http');

app.use('/', express.static("wwwroot"));

const server = app.listen(3000, function(){
    console.log('server is running at %s', server.address().port);
  });

var io = require('socket.io').listen(server);

io.on('connection', function(socket){
    socket.on('poker message', function(msg){
        try {
            var data = JSON.parse(msg);
            if(data && data.room) {
                if(data.command === 'join'){
                    socket.join(msg.to);
                }
                io.to(msg.room).emit('poker message', msg);
                return;
            }
        }
        catch (ex) {
            //empty
        }
        io.emit('poker message', msg);
      });

    socket.on('disconnect', function(){
      });
});

