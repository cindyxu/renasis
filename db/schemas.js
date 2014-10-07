module.exports = function(utils) {

	var _ = utils._;

	var dt = {
		INTEGER : "INTEGER",
		TEXT: "TEXT",
		REAL: "REAL"
	};

	var cst = {
		NOT_NULL: "NOT NULL",
		UNIQUE: "UNIQUE",
		AUTOINCREMENT: "AUTOINCREMENT"
	};

	var schemas = {};

	schemas.models = {
		users: {
			primaryKey: ["user_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"username": [dt.TEXT, [cst.NOT_NULL, cst.UNIQUE]],
				"password_hash" : [dt.TEXT, cst.NOT_NULL],
			},
			foreignKeys: {
				"primary_character_id" : [dt.INTEGER, "characters", "character_id"]
			},
			timestamps: true,
			triggers: { INSERT: {AFTER: [ 
				"INSERT INTO preferences(user_id) VALUES (new.user_id)" 
			]}}
		},

		preferences: {
			primaryKey: ["preferences_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"sound_music_level": [dt.REAL, cst.NOT_NULL, 0],
				"sound_fx_level": [dt.REAL, cst.NOT_NULL, 0],
				"threads_per_page": [dt.INTEGER, cst.NOT_NULL, 30],
				"posts_per_page": [dt.INTEGER, cst.NOT_NULL, 15],
			},
			foreignKeys: {
				"user_id" : [dt.INTEGER, "users", "user_id", cst.NOT_NULL]
			}
		},

		characters: {
			primaryKey: ["character_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"character_name" : [dt.TEXT, cst.NOT_NULL],
			},
			foreignKeys: {
				"user_id" : [dt.INTEGER, "users", "user_id", cst.NOT_NULL],
				"wip_outfit_id" : [dt.INTEGER, "outfits", "outfit_id"],
				"current_outfit_id" : [dt.INTEGER, "outfits", "outfit_id"],
			},
			timestamps : true,
			triggers: { INSERT: { AFTER: [
				'UPDATE users SET primary_character_id = new.character_id WHERE user_id = new.user_id AND primary_character_id = NULL',
				'INSERT INTO outfits (user_id, character_id, outfit_name) VALUES (new.user_id, new.character_id, "wip")',
				'UPDATE characters SET wip_outfit_id = last_insert_rowid()'
			]}}
		},

		outfits: {
			primaryKey: ["outfit_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"outfit_name" : [dt.TEXT, cst.NOT_NULL],
				"pose_str" : [dt.TEXT]
			},
			foreignKeys: {
				"user_id" : [dt.INTEGER, "users", "user_id", cst.NOT_NULL],
				"character_id" : [dt.INTEGER, "characters", "character_id"]
			}
		},

		item_blueprints: {
			primaryKey: ["item_blueprint_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"item_alias" : [dt.TEXT, [cst.NOT_NULL, cst.UNIQUE]],
				"item_name" : [dt.TEXT, [cst.NOT_NULL, cst.UNIQUE]],
				"category" : [dt.TEXT, cst.NOT_NULL],
				"subcategory" : [dt.TEXT, cst.NOT_NULL]
			}
		},

		item_equip_options: {
			primaryKey: ["item_equip_option_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"varieties" : [dt.TEXT, cst.NOT_NULL],
				"poses_str" : [dt.TEXT, cst.NOT_NULL],
			},
			foreignKeys: {
				"item_blueprint_id" : [dt.INTEGER, "item_blueprints", "item_blueprint_id", cst.NOT_NULL]
			}
		},

		items: {
			primaryKey: ["item_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"item_alias" : [dt.TEXT, cst.NOT_NULL]
			},
			foreignKeys: {
				"item_blueprint_id" : [dt.INTEGER, "item_blueprints", "item_blueprint_id", cst.NOT_NULL],
				"user_id" : [dt.INTEGER, "users", "user_id"]
			},
			timestamps: true
		},

		item_equips: {
			primaryKey: ["item_equip_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"item_alias" : [dt.TEXT, cst.NOT_NULL],
				"variety" : [dt.TEXT, cst.NOT_NULL],
				"layer" : [dt.TEXT, cst.NOT_NULL],
				"layer_order" : [dt.INTEGER, cst.NOT_NULL]
			},
			foreignKeys: {
				"item_id" : [dt.INTEGER, "items", "item_id", cst.NOT_NULL],
				"outfit_id" : [dt.INTEGER, "outfits", "outfit_id", cst.NOT_NULL]
			}
		},

		subforums: {
			primaryKey: ["subforum_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"subforum_name" : [dt.TEXT, cst.NOT_NULL],
				"subforum_alias" : [dt.TEXT, cst.NOT_NULL]
			}
		},

		threads: {
			primaryKey: ["thread_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"thread_name" : [dt.TEXT, cst.NOT_NULL],
				"thread_alias" : [dt.TEXT, cst.NOT_NULL],
				"creator_name" : [dt.TEXT, cst.NOT_NULL],
				"last_poster_name" : [dt.TEXT, cst.NOT_NULL],
				"subforum_name" : [dt.TEXT, cst.NOT_NULL]
			},
			foreignKeys: {
				"subforum_id" : [dt.INTEGER, "subforums", "subforum_id", cst.NOT_NULL],
				"creator_id" : [dt.INTEGER, "characters", "character_id", cst.NOT_NULL],
				"last_poster_id" : [dt.INTEGER, "characters", "character_id", cst.NOT_NULL]
			},
			timestamps: true
		},

		posts: {
			primaryKey: ["post_id", dt.INTEGER, cst.AUTOINCREMENT],
			fields: {
				"poster_name" : [dt.TEXT, cst.NOT_NULL],
				"message_bb" : [dt.TEXT, cst.NOT_NULL],
				"post_color" : [dt.TEXT, cst.NOT_NULL, "'#ffffff'"]
			},
			foreignKeys: {
				"thread_id" : [dt.INTEGER, "threads", "thread_id", cst.NOT_NULL],
				"poster_id" : [dt.INTEGER, "characters", "character_id", cst.NOT_NULL]
			},
			timestamps: true,
			triggers: {
				INSERT: { AFTER: [
					"UPDATE threads SET last_poster_id = new.poster_id, last_poster_name = new.poster_name WHERE thread_id = new.thread_id"
				]}
			}
		}
	};

	schemas.fields = {};
	for (var k in schemas.models) {
		var model = schemas.models[k];
		schemas.fields[k] = Object.keys(model.fields);
		if (model.foreignKeys) schemas.fields[k] = schemas.fields[k].concat(Object.keys(model.foreignKeys));
		if (model.timestamps) {
			schemas.fields[k].push("created_at");
			schemas.fields[k].push("updated_at");
		}

		model.triggers = model.triggers || {};
		model.triggers.INSERT = model.triggers.INSERT || {};
		model.triggers.UPDATE = model.triggers.UPDATE || {};
		model.triggers.INSERT.BEFORE = model.triggers.INSERT.BEFORE || [];
		model.triggers.UPDATE.BEFORE = model.triggers.UPDATE.BEFORE || [];
		model.triggers.INSERT.AFTER = model.triggers.INSERT.AFTER || [];
		model.triggers.UPDATE.AFTER = model.triggers.UPDATE.AFTER || [];
	}

	/* IF YOU MODIFY THIS, PLEASE REMEMBER TO COPY OVER TO public/javascripts/schemas */
	schemas.definitions = {
		item_equips: {
			layer: function(itemEquip) {
				var subcategory = itemEquip.subcategory || itemEquip["data-item-subcategory"];
				return ((subcategory === "back" ||
					subcategory === "tail" ||
					subcategory === "background" ||
					subcategory === "wings") ? "back" : "front");
			}
		}
	};

	schemas.defaults = {
		preferences: {
			threads_per_page: 30,
			posts_per_page: 15
		}
	};

	return schemas;

};