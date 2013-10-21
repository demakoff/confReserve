var express = require('express');
var http = require('http');
var path = require('path');
var config = require('./config');
var log = require('./libs/log.js')(module);
var mongoose = require('./libs/mongoose');
var ldap = require('ldapjs');
var async = require('async');
var Reservation = require('./models/reservation.js').Reservation;
var app = express();

// all environments
app.use(express.favicon());
if (app.get('env') == 'development') {
    app.use(express.logger('dev'));
} else {
    app.use(express.logger('default'));   }
app.use(express.bodyParser()); //req.body...
app.use(express.cookieParser());
var MongoStore = require('connect-mongo')(express);

app.use(express.session({
    secret: config.get('session:secret'),
    key: config.get('session:key'),
    cookie: config.get('session:cookie'),

    store: new MongoStore({mongoose_connection: mongoose.connection})
}));

app.use(app.router);   // app.get(), app.post()....
app.use(express.static(path.join(__dirname, 'public')));



http.createServer(app).listen(config.get('port'), function(){
    log.info('Express server listening on port ' + config.get('port'));
});

var client = ldap.createClient({
    url: config.get('ldap:url')
});


// Authorization middleware, userdata in a req.body
app.post('/login', function(req, res, next){

    //res.set('Content-Type', 'application/json');

    if ((!req.body.uid)||(!req.body.password)) {
        res.send(400, "Empty uid and/or password");
        return;
    }

// LDAP search inits
    var base = config.get('ldap:base');
    var filterUid = 'uid='+req.body.uid;
    var opts = {
        filter: filterUid,
        scope: 'sub',
        attributes: ['uid','dn']
    };

// Waterfall method allows to start every next function with arguments of previous and only after it finished
    async.waterfall([
        ldapSearch,
        entryHandler,
        ldapBinder
// Final callback function execute if error arised or in the end, if all body functions were successful
    ], function(err){
        if (!err){
            res.send(200);
            //res.json(reservations);
            //log.info('Reservations outputed');
            return;
        }
        if (err.code){
            res.send(err.code, err.message);
            return;
        }
        next(err);
    });

// Searches user by options (opts) and handle available events
    function ldapSearch(callback){
        client.search(base, opts, function(err, result) {

            var entries = [];
            result.on('searchEntry', function(entry) {
                log.info('entry: ' + JSON.stringify(entry.object));
                entries.push(entry.object);
            });
            result.on('error', function(err) {
                callback(err);
            });
            result.on('end', function (resultEnd){
                callback(null, resultEnd, entries, req)});
        });
    }
// Search results handler
    function entryHandler(resultEnd, entries, req, callback){
        if (resultEnd.status != 0) {
            var err = 'non-zero status from LDAP search';
            callback(new Error(err));
        }
        log.info(req.body.uid+' Found entries: '+entries.length);

        if (entries.length == 0){
            callback({'code':400, message: "User not found"});
        } else {
            if (entries.length == 1) {
                var user = entries[0];
                log.info("Found 1 user: "+JSON.stringify(user)+' uid: '+user.uid);
                callback(null, user, req);
            } else {
                callback({'code':400, message: "Not unique user"});

            }
        }
    }
// LDAP Authorization
    function ldapBinder(user, req, callback){
        client.bind(user.dn, req.body.password, function(err){
            if (err) {
                if (err.message == 'Invalid Credentials') {
                    callback({'code':400, message: "Invalid Credentials"});
                }
                else { callback(err);}
            } else {
                log.info('Client is bound');
// req.session.userId uses for user identification when he creates and removes reservations
                req.session.userId = user.uid;
                callback(null);
                /*Reservation.find({}, function(err, reservations){
                    if (err) callback(err);
                    callback(null, reservations);
                });*/
            }
        });
    }
});

// Get all reservation middleware
app.get('/reservations', function(req, res, next){
    Reservation.find({}, function(err, reservations){
        if (err) next(err);
        res.set('Content-Type', 'application/json');
        res.json(reservations);
        log.info('Reservations outputed');
    });
});

// Create new reservation middleware
app.post('/reservations', function(req, res, next){
// Check if user session still alive, otherwise - need relogin (create new session)
    if (!req.session.userId)  {
        res.send(400, "Please, relogin");
        return;
    }
    if (req.body.date<(new Date())) {
        res.send(400, "You can`t back in time");
        return;
    }
        var opts = {
            roomId: req.body.roomId,
            date: req.body.date
        };
// Check if new reservation is available with choosen data
        Reservation.find({roomId: req.body.roomId, date: { $lte: req.body.date}, endDate: { $gt: req.body.date } }, function(err, reserv){
            if (err) next(err);
            if (reserv != '') {
                log.info('Reservation already exists');
                res.send(400, 'Reservation already exists');
                return;
            }
            opts.userId = req.session.userId;
            opts.endDate = req.body.endDate;
            reservation = new Reservation(opts);
            reservation.save(function(err){
                if (err) next(err);
                log.info('New reservation created');
                res.send(200);
// Output all reservations, with last changes.
                /*Reservation.find({}, function(err, reservations){
                if (err) next(err);
                    res.json(reservations);
                    log.info('Reservations outputed');
                });*/
            });
        });


});

// Remove existing reservation middleware
app.delete('/reservations',  function(req, res, next){
// Check if user session still alive, otherwise - need relogin (create new session)
    if (!req.session.userId) {
        log.info('Please, relogin');
        res.send(400, 'Please, relogin');
    }

    var reservation = {
        roomId: req.body.roomId,
        userId: req.session.userId,
        date: req.body.date
    };
// Choosen reservation search
    Reservation.find(reservation, function(err, reserv){
        if (reserv != '') {
            Reservation.remove(reservation, function(err){
                if (err) next(err);
                log.info('Reservation Removed');
                res.send(200);
            });
        }  else {
            log.info('Reservation not found');
            res.send(400, 'Reservation not found');
        }
    });
});

// not existing pages handler
app.use(function(req, res, next){
    log.debug('Not found URL: %s',req.url);
    res.send(404, 'URL not found');
});

// Internal error handler
app.use(function(err, req, res, next){
    if (app.get('env') == 'development'){
        log.debug('Internal Error: '+ err);
        var errorHandler = express.errorHandler();
        errorHandler(err, req, res, next);
    } else
        res.send(500);
});

// Older than now reservations are automatically removed (once in hour check)
function deleteOldReserv(){
    var nowDate = new Date();
    if (nowDate.getMinutes() == 1) {
        Reservation.remove({date:{ $lt: nowDate }}, function(err){
            if (err) next(err);
            log.info('Old reservations removed');
        });
    }
}

var hourTimer = setInterval(deleteOldReserv, 60*1000);











