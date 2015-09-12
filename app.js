var express = require('express'),
    app = express(),
    path = require('path'),
    bodyParser = require('body-parser'),
    cookie = require('cookie'),
    cookieParser = require('cookie-parser'),
    expressSession = require('express-session'),
    MongoStore = require('connect-mongo')(expressSession),
    MongoClient = require('mongodb').MongoClient,
    setting = require('./setting.js');

var sessionStore = new MongoStore({
    url: setting.url
});

var ajax = require('./routes/ajax.js');


var users = [];
users.remove = function(elem){
    for(var i = 0; i < users.length; ++i){
        if(users[i] === elem){
            users.splice(i, 1);
            return;
        }
    }
};

MongoClient.connect(setting.url, function(err, db){
    app.use(express.static(path.join(__dirname, 'static')));
    app.use(bodyParser());
    app.use(cookieParser());
    app.use(expressSession({
        secret: setting.secret,
        cookie: {maxAge: 60000},
        store: sessionStore
    }));
    app.use('/ajax', ajax(db, users));

    var io = require('socket.io')(app.listen(setting.port, function(){
        console.log('server start on port: ' + setting.port);
    }));
    io.use(function(socket, next){
        var reqCookie = socket.request.headers.cookie;
        if(reqCookie){
            var connectSid = cookie.parse(reqCookie)['connect.sid'];
            //var connectSid = cookie.parse(socket.request.headers.cookie)['connect.sid'];
            if(connectSid){
                connectSid = connectSid.slice(connectSid.indexOf(':')+1, connectSid.indexOf('.'));
                db.collection('sessions').findOne(
                    {_id: connectSid},
                    function(err, sessionInfo){
                        var session = JSON.parse(sessionInfo.session);
                        if(session && session.userId){
                            socket.userId = session.userId;
                            next();
                        }
                    });
            }
        }
    });
    io.on('connection', function(socket){
        console.log('connection!');
        console.log(socket.userId);

        users.push(socket.userId);
        socket.broadcast.emit('userLogin', socket.userId);

        socket.on('messageCreate', function(message){
            io.emit('addMessage', message);
        });

        socket.on('getUsersList', function(){
            socket.emit('addUsersList', users);
        });

        socket.on('disconnect', function(){
            users.remove(socket.userId);
            socket.broadcast.emit('userLogout', socket.userId);
            console.log('disconnect!');
        });
    });
});