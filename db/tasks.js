module.exports = function(db) {
	var taskExports = {};

	var equipGroups = ["back", "behind", "arm_behind", "leg_behind", "torso", "leg_above", "arm_above", "head"];
	var defaultPose = "";
	for (var i = 0; i < equipGroups.length; i++) {
		defaultPose += equipGroups[i] + ":0" + (i < equipGroups.length - 1 ? ";" : "");
	}

	var callbackIter = function(seqCmds, i, callback) {
		return function(err) {
			if(err) console.log(i, err);
			if (i < seqCmds.length) {
				db.run(seqCmds[i], callbackIter(seqCmds, i+1, callback));
			}
			else {
				if(callback) callback();
			}
		};
	};

	taskExports.recreateTables = function(callback) {

		var seqCmds = [
			'DELETE FROM preferences',
			'DELETE FROM users',
			'DELETE FROM characters',
			'DELETE FROM outfits',
			'DELETE FROM items',
			'DELETE FROM item_equip_options',
			'DELETE FROM item_equips',
			'DELETE FROM item_blueprints',
			'DELETE FROM threads',
			'DELETE FROM subforums',

			'DROP TABLE item_equips',
			'DROP TABLE outfits',
			'DROP TABLE item_equip_options',
			'DROP TABLE items',
			'DROP TABLE item_blueprints',
			'DROP TABLE characters',
			'DROP TABLE preferences',
			'DROP TABLE users',
			'DROP TABLE threads',
			'DROP TABLE subforums',

			'CREATE TABLE users (' +
				'user_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'username TEXT NOT NULL UNIQUE, ' +
				'password_hash TEXT NOT NULL, ' +
				'primary_character_id INTEGER, ' +
				
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +

				'FOREIGN KEY (primary_character_id) REFERENCES characters(character_id))',

			'CREATE TRIGGER update_user AFTER UPDATE ON users BEGIN ' +
				'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = old.user_id; ' +
			'END', 

			'CREATE TABLE preferences (' +
				'preferences_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'user_id INTEGER NOT NULL, ' +
				'sound_music_level REAL NOT NULL DEFAULT 0, ' +
				'sound_fx_level REAL NOT NULL DEFAULT 0, ' +
				'threads_per_page INTEGER NOT NULL DEFAULT 30, ' +
				'posts_per_page INTEGER NOT NULL DEFAULT 15, ' +
				'FOREIGN KEY (user_id) REFERENCES users(user_id))',

			'CREATE TRIGGER create_user AFTER INSERT ON users BEGIN ' +
				'INSERT INTO preferences (user_id) VALUES (new.user_id); ' + 
			'END',

			'CREATE TABLE characters (' +
				'character_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'character_name TEXT NOT NULL, ' +
				'user_id INTEGER NOT NULL, ' +
				'wip_outfit_id INTEGER, ' +
				'current_outfit_id INTEGER, ' +
				
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +

				'FOREIGN KEY (user_id) REFERENCES users(user_id), ' +
				'FOREIGN KEY (wip_outfit_id) REFERENCES outfits(outfit_id), ' +
				'FOREIGN KEY (current_outfit_id) REFERENCES outfits(outfit_id))',

			'CREATE TRIGGER create_character AFTER INSERT ON characters BEGIN ' +
				// if user doesn't have primary character, set to this
				'UPDATE users SET primary_character_id = new.character_id WHERE user_id = new.user_id AND primary_character_id = NULL; ' +
				// create a wip outfit for this character
				'INSERT INTO outfits (user_id, character_id, outfit_name, pose_str) VALUES (new.user_id, new.character_id, "wip", "' + defaultPose + '");' +
				'UPDATE characters SET wip_outfit_id = last_insert_rowid();' +
			'END',

			'CREATE TRIGGER update_characters AFTER UPDATE ON characters BEGIN ' +
				'UPDATE characters SET updated_at = CURRENT_TIMESTAMP WHERE character_id = old.character_id; ' +
			'END', 

			'CREATE TABLE outfits (' +
				'outfit_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'user_id INTEGER NOT NULL, ' +
				'character_id INTEGER, ' +
				'outfit_name TEXT NOT NULL, ' +
				'pose_str TEXT NOT NULL, ' +

				'FOREIGN KEY (user_id) REFERENCES users(user_id), ' +
				'FOREIGN KEY (character_id) REFERENCES characters(character_id))',

			'CREATE TABLE item_blueprints (' +
				'item_blueprint_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'item_alias TEXT NOT NULL UNIQUE, ' +
				'item_name TEXT NOT NULL UNIQUE, ' +
				'category TEXT NOT NULL, ' +
				'subcategory TEXT NOT NULL)',

			'CREATE TABLE items (' +
				'item_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'item_alias TEXT NOT NULL, ' +
				'item_blueprint_id INTEGER NOT NULL, ' +
				'user_id INTEGER, ' +
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +

				'FOREIGN KEY (user_id) REFERENCES users(user_id), ' +
				'FOREIGN KEY (item_blueprint_id) REFERENCES item_blueprints(item_blueprint_id))',

			'CREATE TRIGGER update_items AFTER UPDATE ON items BEGIN ' +
				'UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE item_id = old.item_id; ' +
			'END', 

			'CREATE TABLE item_equip_options (' +
				'item_blueprint_id INTEGER PRIMARY KEY, ' +
				'varieties TEXT NOT NULL, ' +
				'poses_str TEXT NOT NULL, ' +

				'FOREIGN KEY (item_blueprint_id) REFERENCES item_blueprints(item_blueprint_id))',

			'CREATE TABLE item_equips (' +
				'item_equip_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'item_id INTEGER NOT NULL, ' +
				'outfit_id TEXT NOT NULL, ' +
				'item_alias TEXT NOT NULL, ' +
				'variety TEXT NOT NULL, ' +
				'layer TEXT NOT NULL, ' +
				'layer_order INTEGER NOT NULL, ' +

				'FOREIGN KEY (item_id) REFERENCES items(item_id), ' +
				'FOREIGN KEY (outfit_id) REFERENCES outfits(outfit_id))',

			'CREATE TABLE subforums (' +
				'subforum_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'subforum_name TEXT NOT NULL, ' +
				'subforum_alias TEXT NOT NULL)',

			'CREATE TABLE threads (' +
				'thread_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'thread_name TEXT NOT NULL, ' +
				'thread_alias TEXT NOT NULL, ' +
				'creator_id INTEGER NOT NULL, ' +
				'last_poster_id INTEGER NOT NULL, ' +
				'subforum_id INTEGER NOT NULL, ' +
				'subforum_name TEXT NOT NULL, ' +
				
				'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
				'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
				'last_post_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +

				'FOREIGN KEY (subforum_id) REFERENCES subforums(subforum_id), ' +
				'FOREIGN KEY (creator_id) REFERENCES characters(character_id), ' +
				'FOREIGN KEY (last_poster_id) REFERENCES characters(character_id))',

			'CREATE TRIGGER update_threads AFTER UPDATE ON threads BEGIN ' +
				'UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE thread_id = old.thread_id; ' +
			'END'
		];
		callbackIter(seqCmds, 0, callback)();
	};

	taskExports.createItemInstances = function(count, callback) {
		db.all("SELECT * FROM item_blueprints", function(err, blueprints) {
			var query = "INSERT INTO items (item_blueprint_id, item_alias) VALUES ";
			for (var i = 0; i < blueprints.length; i++) {
				for (var j = 0; j < count; j++) {
					query += "(" + blueprints[i].item_blueprint_id + ", \"" + blueprints[i].item_alias + "\")";
					if (i < blueprints.length - 1 || j < count - 1) {
						query += ", ";
					}
				}
			}
			db.run(query, callback);
		});
	};

	taskExports.createGod = function(userHelper, callback) {
		userHelper.createUser("god", "1", function(err) {
			db.get("SELECT * FROM users WHERE username = ?", "god", function(err, userObj) {
				userHelper.createCharacterForUser("chis", userObj, function(err) {
					if (err) { console.log(err); return; }
					if (callback) callback();
				});
			});
		});
	};

	taskExports.populateSubforums = function(callback) {
		db.run('INSERT INTO subforums (subforum_name, subforum_alias) VALUES ' +
			'("teatyme", "Teatyme"), ' +
			'("wilds", "Wilds")',
		function(err) {
			if (err) { console.log(err); return; }
			if (callback) callback();
		});
	};

	taskExports.populateItemBlueprints = function(callback) {
		var itemVarieties = [];
		var itemPoseStrs = [];

		//fox ears
		itemVarieties.push("red");
		itemPoseStrs.push("head:(0:32,34);" +
			"behind:(0:12,34)");

		//human1
		itemVarieties.push("human1");
		itemPoseStrs.push("arm_above:(0:31,63);" +
			"head:(0:15,38);" +
			"torso:(0:21,60);" +
			"leg_behind:(0:18,75);" +
			"arm_behind:(0:17,63);" +
			"leg_above:(0:28,76)");

		//jeans
		itemVarieties.push("navy");
		itemPoseStrs.push("leg_above:(0:20,76)");

		//mermaid
		itemVarieties.push("aquamarine");
		itemPoseStrs.push("head:(0:8,35)");

		//miko
		itemVarieties.push("pink");
		itemPoseStrs.push("head:(0:10,37);" +
			"behind:(0:13,36)");

		//roses
		itemVarieties.push("red");
		itemPoseStrs.push("head:(0:31,37);" +
			"behind:(0:12,37)");

		//shirt
		itemVarieties.push("black");
		itemPoseStrs.push("arm_above:(0:30,64);" +
			"leg_above:(0:20,65);" +
			"arm_behind:(0:21,64)");

		//sneakers
		itemVarieties.push("red");
		itemPoseStrs.push("leg_above:(0:18,87)");

		//static
		itemVarieties.push("blue,black");
		itemPoseStrs.push("head:(0:12,35)");

		//sweater
		itemVarieties.push("salmon");
		itemPoseStrs.push("arm_above:(0:23,63);" +
			"leg_above:(0:20,67);" +
			"arm_behind:(0:17,67)");

		//tank top
		itemVarieties.push("teal");
		itemPoseStrs.push("arm_above:(0:25,63);" +
			"leg_above:(0:20,67)");
		
		//unimpressed
		itemVarieties.push("yellow");
		itemPoseStrs.push("head:(0:18,50)");
		
		//wings
		itemVarieties.push("periwinkle");
		itemPoseStrs.push("back:(0:8,42)");

		var insertBlueprints = function() {

			// THIS LIST MUST BE ORDERED BY item_name
			db.run('INSERT INTO item_blueprints (item_name, item_alias, category, subcategory) VALUES ' +
				'("fox_ears", "Fox ears", "clothing", "head"), ' +
				'("human1", "Human1", "clothing", "base"), ' +
				'("jeans", "Jeans", "clothing", "bottom"), ' +
				'("mermaid", "Mermaid hair", "clothing", "hair"), ' +
				'("miko", "Miko hair", "clothing", "hair"), ' +
				'("roses", "Roses", "clothing", "head"), ' +
				'("shirt", "Shirt", "clothing", "top"), ' +
				'("sneakers", "Sneakers", "clothing", "feet"), ' +
				'("static", "Static hair", "clothing", "hair"), ' +
				'("sweater", "Sweater", "clothing", "top"), ' +
				'("tank_top", "Tank top", "clothing", "top"), ' +
				'("unimpressed", "Unimpressed face", "clothing", "face"), ' +
				'("wings", "Wings", "clothing", "back")', function(err) {
					if (err) console.log(err);
					db.all("SELECT item_blueprint_id, item_name FROM item_blueprints ORDER BY item_name", function(err, blueprints) {
						var itemsFinished = 0;
						if (err) console.log(err);
						for (var i = 0; i < blueprints.length; i++) {
							db.run("INSERT INTO item_equip_options (item_blueprint_id, varieties, poses_str) VALUES ($itemBlueprintId, $varieties, $posesStr)", {
								"$itemBlueprintId": blueprints[i].item_blueprint_id,
								"$varieties": itemVarieties[i],
								"$posesStr": itemPoseStrs[i] }, function() {
									itemsFinished++;
									if (itemsFinished === blueprints.length) {
										if (callback) callback();
									}
								});
						}	
					});
			});
		};
		db.run('DELETE * from item_blueprints', function() {
			db.run('DELETE * from item_equip_options', function() {
				insertBlueprints();
			});
		});
	};

	return taskExports;
};