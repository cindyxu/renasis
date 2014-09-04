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

var utils = { "db" : db, "mout" : mout, "gm" : gm, "fs" : fs, "Q" : Q, "_" : _ };
utils.itemHelper = require('./routes/helpers/item')(utils);
utils.charHelper = require('./routes/helpers/character')(utils);
utils.constants = require('./routes/helpers/constants');

var character = require('./routes/character')(utils);
var user = require('./routes/user')(utils);
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
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

app.get('/smforum', public.smforum);
app.get('/smthread', public.smthread);
app.get('/smsplash', public.smsplash);
app.get('/smforumthreads', public.smforumthreads);

app.get('/dressroom', user.dressroom);
app.get('/character/:char_id/dressroom', character.dressroom);
app.get('/character/:char_id/dressroom/get_wardrobe_subcategory_items/:subcategory', character.getWardrobeSubcategoryItems);
app.post('/character/:char_id/dressroom/toggle_equip_item', character.toggleEquipItem);
app.get('/:what', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
