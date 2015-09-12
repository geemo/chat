var express = require('express'),
    router = express.Router();
function findUser(users, userId){
    for(var i = 0; i < users.length; ++i)
        if(users[i] === userId) return true;
    return false;
}
module.exports = function(db, users){
    router.get('/validate', function(req, res){
        var userId = req.session.userId;
        if(userId && !findUser(users, userId)){
            db.collection('users').findOne(
                {_id: userId},
                function(err, user){
                    if(user){
                        res.send(user._id);
                    } else {
                        res.sendStatus(403);
                    }
                });
        } else {
            res.sendStatus(403);
        }
    });
    router.get('/logout', function(req, res){
        req.session.userId = null;
        res.sendStatus(200);
    });
    router.post('/login', function(req, res){
        var userId = req.body.userId;
        if(userId && !findUser(users, userId)){
            db.collection('users').findOne(
                {_id: userId},
                function(err, user){
                    if(user){
                        req.session.userId = user._id;
                        res.send(user._id);
                    } else {
                        db.collection('users').insertOne(
                            {
                                _id: userId
                            },
                            function(err, result){
                                if(result){
                                    req.session.userId = result.ops[0]._id;
                                    res.send(result.ops[0]._id);
                                } else {
                                    res.sendStatus(403);
                                }
                            });
                    }
                });
        }
    });

    return router;
};