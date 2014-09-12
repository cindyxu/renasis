/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');

var public = require('./routes/public');

var http = require('http');
var path = require('path');

var mongo = require('mongodb');

var monk = require('monk');
var db = monk('localhost:27017/renasistest');

var bcrypt = require('bcrypt');

var fs = require('fs');
var gm = require('gm');
var mout = require('mout');
var Q = require('q');

var _ = require('underscore');
_.mixin({
	findIndex : function(obj, iterator, context) {
		var idx;
		_.any(obj, function(value, index, list) {
			if(iterator.call(context, value, index, list)) {
			idx = index;
			return true;
			}
		});
		return idx;
	}
});

var utils = { 
	"db" : db, 
	"mout" : mout, 
	"gm" : gm, 
	"fs" : fs, 
	"Q" : Q, 
	"_" : _, 
	"bcrypt" : bcrypt };

utils.constants = require('./routes/helpers/constants');
// nondependents
utils.creationHelper = require('./routes/helpers/creation')(utils);

// possibly dependents
utils.userHelper = require('./routes/helpers/user')(utils);
utils.itemHelper = require('./routes/helpers/item')(utils);
utils.creationHelper = require('./routes/helpers/creation')(utils);
utils.wardrobeHelper = require('./routes/helpers/wardrobe')(utils);


var character = require('./routes/character')(utils);
var user = require('./routes/user')(utils);
var forum = require('./routes/forum')(utils);
var app = express();

// all environments
//app.set('port', process.env.PORT || 3000);
app.set('port', process.env.PORT || 8000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser());
app.use(express.session({ secret: 'ilovebigducks342' }));
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

app.get('/smforum', public.smforum);
app.get('/smthread', public.smthread);
app.get('/smforumthreads', public.smforumthreads);

app.get('/login', public.login);
app.get('/signup', public.signup);
app.post('/login', user.login);
app.post('/signup', user.signup);

app.get("/forums/:subforum", forum.showSubforum);
app.get("/forums/:subforum/new", forum.newThread);
app.post("/forums/:subforum/new", forum.createThread);
app.get("/forums/:subforum/:thread_id", forum.showThread);

app.get('/dressroom', character.dressroom);
app.get('/dressroom/get_wardrobe_subcategory_items/:subcategory', character.getWardrobeSubcategoryItems);
app.post('/dressroom/toggle_equip_item', character.toggleEquipItem);
app.post('/dressroom/shift_equipped_item', character.shiftEquippedItem);
app.post('/dressroom/copy_outfit', character.copyOutfit);
app.get('/:what', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
