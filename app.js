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

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database("sqldata/renasistest");

var bcrypt = require('bcrypt');

var fs = require('fs');
var gm = require('gm');
var mout = require('mout');
var Q = require('q');
var crypto = require('crypto');
var debug = require('debug')('renasis');

var _ = require('underscore');
_.str = require('underscore.string');
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
	},

	deferAll: function(obj, iterator, callback) {
		console.log("HEY");
		if (obj.length === 0) callback();

		var finished = 0;
		var callbackIntermediate = function() {
			console.log("FINSIHED");
			finished++;
			if (finished === obj.length) {
				callback();
			}
		};

		console.log("HIYA", obj.length);
		for (var i = 0; i < obj.length; i++) {
			console.log("RUN");
			iterator(obj[i], callbackIntermediate);
		}
	}
});

var utils = { 
	"db" : db, 
	"mout" : mout, 
	"gm" : gm, 
	"fs" : fs, 
	"Q" : Q, 
	"_" : _, 
	"bcrypt" : bcrypt,
	"crypto" : crypto,
	"debug" : debug };

var app = express();
utils.app = app;

utils.config = require('./config.js');
utils.constants = require('./routes/helpers/constants');
utils.schemas = require('./db/schemas.js')(utils);
utils.itemCatalogue = require('./db/item_catalogue.js');
utils.skillCatalogue = require('./db/skill_catalogue.js');
utils.speciesCatalogue = require('./db/species_catalogue.js');
utils.forumCatalogue = require('./db/forum_catalogue.js');

var dbTasks = require('./db/tasks')(utils);
// nondependents
utils.creationHelper = require('./routes/helpers/creation')(utils);

// possibly dependents
utils.userHelper = require('./routes/helpers/user')(utils);
utils.creationHelper = require('./routes/helpers/creation')(utils);
utils.wardrobeHelper = require('./routes/helpers/wardrobe')(utils);
utils.forumHelper = require('./routes/helpers/forum')(utils);
utils.battleHelper = require('./routes/helpers/battle')(utils);
utils.eventHelper = require('./routes/helpers/events')(utils);
var wardrobe = require('./routes/wardrobe')(utils);
var user = require('./routes/user')(utils);
var forum = require('./routes/forum')(utils);

db.serialize(function() {

	dbTasks.recreateTables(function() {
		console.log("Tables recreated");
		dbTasks.populateSkills(function() {
			console.log("Skills added");
			dbTasks.populateSpecies(function() {
				console.log("Species added");
				dbTasks.populateItemBlueprints(function() {
					console.log("Items added");
					delete utils.itemCatalogue;
					delete utils.skillsCatalogue;
					delete utils.speciesCatalogue;
					dbTasks.populateForums(function() {
						console.log("Forums added");
						dbTasks.createItemInstances(1, function() {
							console.log("Item instances created");
							dbTasks.createGod(utils.userHelper);
							console.log("God created");
						});
					});
				});	
			});
		});
	});
});

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

app.get('/login', public.login);
app.get('/signup', public.signup);
app.post('/login', user.login);
app.post('/signup', user.signup);
app.get('/new_character', user.newCharacter);
app.post('/new_character', user.createCharacter);

app.get("/forums/:subforum", forum.showSubforum);
app.get("/forums/:subforum/new", forum.newThread);
app.post("/forums/:subforum/new", forum.createThread);
app.get("/forums/:subforum/:thread_id", forum.showThread);
app.post("/forums/:subforum/:thread_id", forum.createPost);

app.get('/dressroom', wardrobe.dressroom);
app.get('/dressroom/get_wardrobe_subcategory_items/:subcategory', wardrobe.getWardrobeSubcategoryItems);
app.post('/dressroom/toggle_equip_item', wardrobe.toggleEquipItem);
app.post('/dressroom/shift_equipped_item', wardrobe.shiftEquippedItem);
app.post('/dressroom/copy_outfit', wardrobe.copyOutfit);
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
  debug("initialized!");
});
