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
		PRIMARY_KEY: "PRIMARY KEY",
		AUTOINCREMENT: "AUTOINCREMENT"
	};

	var schemas = {};

	schemas.defaults = {
		preferences: {
			threads_per_page: 30,
			posts_per_page: 15
		},
		battle_stats: {
			hp: 10,
			mana: 10
		}
	};

	schemas.models = {

		// login credentials. one user can have many characters.
		users: {
			fields: {
				"user_id" : { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"username": { "type": dt.TEXT, "constraints": [cst.NOT_NULL, cst.UNIQUE] },
				"password_hash" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
			},
			foreignKeys: {
				"primary_character_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id" }
			},
			timestamps: true,
			triggers: { INSERT: { AFTER: [
				"INSERT INTO preferences(user_id) VALUES (new.user_id)" 
			]}}
		},

		// user-wide settings
		preferences: {
			fields: {
				"sound_music_level": { "type": dt.REAL, "constraints": cst.NOT_NULL, "default": 0.0 },
				"sound_fx_level": { "type": dt.REAL, "constraints": cst.NOT_NULL, "default": 0.0 },
				"threads_per_page": { "type": dt.INTEGER, "constraints": cst.NOT_NULL, "default": 30 },
				"posts_per_page": { "type": dt.INTEGER, "constraints": cst.NOT_NULL, "default": 15 }
			},
			foreignKeys: {
				"user_id" : { "type": dt.INTEGER, "table": "users", "on": "user_id", "constraints": cst.PRIMARY_KEY }
			}
		},

		// bb-code formatting for posts
		post_styles: {
			fields: {
				"post_color" : { "type": dt.TEXT, "constraints": cst.NOT_NULL, "default": "'#ffffff'" },
				"post_layout_bb_begin" : { "type": dt.TEXT, "constraints": cst.NOT_NULL, "default": "'" },
				"post_layout_bb_end" : { "type": dt.TEXT, "constraints": cst.NOT_NULL, "default": "'" },
			},
			foreignKeys: {
				"user_id" : { "type": dt.INTEGER, "table": "users", "on": "user_id", "constraints": cst.PRIMARY_KEY }
			}
		},

		characters: {
			fields: {
				"character_id": { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"character_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
			},
			foreignKeys: {
				"user_id" : { "type": dt.INTEGER, "table": "users", "on": "user_id" },
				"wip_outfit_id" : { "type": dt.INTEGER, "table": "outfits", "on": "outfit_id" },
				"current_outfit_id" : { "type" : dt.INTEGER, "table" : "outfits", "on" : "outfit_id" },
				"current_thread_id" : { "type" : dt.INTEGER, "table" : "threads", "on" : "thread_id" },
				"current_battle_id" : { "type" : dt.INTEGER, "table" : "battles", "on" : "battle_id" }
			},
			timestamps : true,
			triggers: { INSERT: { AFTER: [
				'UPDATE users SET primary_character_id = new.character_id WHERE user_id = new.user_id AND primary_character_id = NULL',
				'INSERT INTO outfits (user_id, character_id, outfit_name) VALUES (new.user_id, new.character_id, "wip")',
				'INSERT INTO battle_stats (character_id) VALUES (new.character_id)',
				'UPDATE characters SET wip_outfit_id = last_insert_rowid()'
			]}}
		},

		battles: {
			fields : {
				"battle_id" : { "type" : dt.INTEGER, "constraints" : [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"turn" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				// 1 if player won, 0 if player lost
				"outcome" : { "type" : dt.INTEGER }
			},
			foreignKeys : {
				"thread_id" : { "type" : dt.INTEGER, "table" : "threads", "on" : "thread_id", "constraints" : cst.NOT_NULL },
				"last_post_id" : { "type" : dt.INTEGER, "table" : "posts", "on" : "post_id", "constraints" : cst.NOT_NULL }
			}
		},

		// creature "type" - eg. owl, cat, ...
		creature_blueprints: {
			fields: {
				"creature_blueprint_id" : { "type" : dt.INTEGER, "constraints" : [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"creature_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"creature_alias" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
			}
		},

		creatures: {
			fields: { 
				"creature_id" : { "type" : dt.INTEGER, "constraints" : [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"creature_alias" : { "type" : dt.TEXT }
			},
			foreignKeys: {
				"creature_blueprint" : { "type": dt.INTEGER, "table": "creature_blueprints", "on": "blueprint_id" },
				"current_thread_id" : { "type": dt.INTEGER, "table": "threads", "on": "thread_id" },
				"current_battle_id" : { "type": dt.INTEGER, "table": "battles", "on": "battle_id" }
			},
			timestamps: true,
			triggers: { INSERT: { AFTER: [
				"UPDATE creatures SET creature_alias = (SELECT creature_alias FROM creature_blueprints WHERE creature_blueprint_id = new.creature_blueprint_id) WHERE creature_id = new.creature_id"
			]}}
		},

		encounters: {
			fields: {
				"chance" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL }
			},
			foreignKeys: {
				"subforum_name" : { "type" : dt.INTEGER, "table" : "subforums", "on" : "subforum_name", "constraints" : cst.NOT_NULL },
				"creature_id" : { "type" : dt.INTEGER, "table" : "creatures", "on" : "creature_id" },
				"item_blueprint_id" : { "type" : dt.INTEGER, "table" : "item_blueprints", "on" : "item_blueprint_id" }
			}
		},

		battlegear_blueprints: {
			fields: {
				// required stats to equip
				"str_req" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"vit_req" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"dex_req" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"agi_req" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"mag_req" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				// base stat bonuses of this weapon
				"str_base" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"vit_base" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"dex_base" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"agi_base" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"mag_base" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				// bonus proportional to stats of user
				"str_mult" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0 },
				"vit_mult" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0 },
				"dex_mult" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0 },
				"agi_mult" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0 },
				"mag_mult" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0 }
			},
			foreignKeys: {
				"item_blueprint_id" : { "type" : dt.INTEGER, "table" : "item_blueprints", "on" : "item_blueprint_id", "constraints" : cst.PRIMARY_KEY }
			}
		},

		// junction table btw weapons x characters or creatures, and skills
		carriers_skills: {
			fields: {
				// what level is the skill? does not apply to weapons.
				"level" : { "type" : dt.INTEGER }
			},
			foreignKeys: {
				// for characters, the skill must be present in battlegear to be used,
				// but the character must also have the parent skills.
				// the level is dependent on the character/creature.
				"battlegear_blueprint_id" : { "type" : dt.INTEGER, "table" : "battlegear_blueprints", "on" : "battlegear_blueprint_id" },
				"character_id" : { "type" : dt.INTEGER, "table" : "characters", "on" : "character_id" },
				// whereas creatures are their own battlegear so they have their own skills
				"creature_blueprint_id" : { "type" : dt.INTEGER, "table" : "creature_blueprints", "on" : "creature_blueprint_id" },
				
				"skill_id" : { "type" : dt.INTEGER, "table" : "skills", "on" : "skill_id", "constraints" : cst.NOT_NULL }
			},
			checks: [
				"level != NULL OR battlegear_blueprint_id != NULL"
			]
		},

		// skills are further defined in code.
		skills: {
			fields: {
				"skill_id" : { "type" : dt.INTEGER, "constraints" : [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"skill_alias" : { "type" : dt.TEXT, "constraints" : cst.NOT_NULL },
				"skill_name" : { "type" : dt.TEXT, "constraints" : cst.NOT_NULL },
				"skill_desc" : { "type" : dt.TEXT },
				"mana_cost" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"active" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				// skills required to learn this skill, denoted as skill:level,skill2:level2, etc.
				"ancestors" : { "type" : dt.TEXT },
				// skills unlocked from this skill, denoted as skill:level,skill2:level2, etc.
				// note that other skills may still be required to unlock children
				"children" : { "type" : dt.TEXT }
			}
		},

		battle_stats: {
			fields: {
				"max_hp" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : schemas.defaults.battle_stats.hp },
				"max_mana" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : schemas.defaults.battle_stats.mana },
				"str" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"vit" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"dex" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"agi" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"mag" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 }
			},
			foreignKeys: {
				"character_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id", "constraints" : cst.UNIQUE },
				"creature_id" : { "type": dt.INTEGER, "table": "creatures", "on": "creature_id", "constraints" : cst.UNIQUE }
			},
			triggers: { INSERT: { AFTER: [
				"INSERT INTO battle_statuses (hp, mana, character_id, creature_id) VALUES (new.max_hp, new.max_mana, new.character_id, new.creature_id)"
			]}}
		},

		// decides how quickly each stat will grow when skill is used.
		// "leveling up" is independent to each attribute!
		battle_stat_growths: {
			fields: {
				"str" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"vit" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"dex" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"agi" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"mag" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				// growth = stat_growth / (degrade * stat_level) !! NON-ZERO
				"degrade" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 1 }
			},
			foreignKeys: {
				"skill_id" : { "type": dt.INTEGER, "table": "skills", "on": "skill_id", "constraints" : cst.PRIMARY_KEY }
			}
		},

		battle_statuses: {
			fields: {
				"hp" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL },
				"mana" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL },

				"exp_str" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"exp_vit" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"exp_dex" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"exp_agi" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"exp_mag" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 }
			},
			foreignKeys: {
				"character_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id", "constraints" : cst.UNIQUE },
				"creature_id" : { "type": dt.INTEGER, "table": "creatures", "on": "creature_id", "constraints" : cst.UNIQUE }
			}
		},

		outfits: {
			fields: {
				"outfit_id" : { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"outfit_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"pose_str" : { "type": dt.TEXT }
			},
			foreignKeys: {
				"user_id" : { "type": dt.INTEGER, "table": "users", "on": "user_id", "constraints": cst.NOT_NULL },
				"character_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id" }
			}
		},

		item_blueprints: {
			fields: {
				"item_blueprint_id" : { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"item_alias" : { "type": dt.TEXT, "constraints": [cst.NOT_NULL, cst.UNIQUE] },
				"item_name" : { "type": dt.TEXT, "constraints": [cst.NOT_NULL, cst.UNIQUE] },
				"category" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"subcategory" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
			}
		},

		item_equip_options: {
			fields: {
				"varieties" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"poses_str" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
			},
			foreignKeys: {
				"item_blueprint_id" : { "type": dt.INTEGER, "table": "item_blueprints", "on": "item_blueprint_id", "constraints": cst.PRIMARY_KEY }
			}
		},

		items: {
			fields: {
				"item_id" : { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"item_alias" : { "type": dt.TEXT, "constraints" : cst.NOT_NULL }
			},
			foreignKeys: {
				"item_blueprint_id" : { "type": dt.INTEGER, "table": "item_blueprints", "on": "item_blueprint_id", "constraints": cst.NOT_NULL },
				"user_id" : { "type": dt.INTEGER, "table": "users", "on": "user_id" },
				//
				"character_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id" }
			},
			timestamps: true,
			triggers: { INSERT: { AFTER: [
				"UPDATE items SET item_alias = (SELECT item_alias FROM item_blueprints WHERE item_blueprint_id = new.item_blueprint_id) WHERE item_id = new.item_id"
			]}}
		},

		item_equips: {
			fields: {
				"item_alias" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"variety" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"layer" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"layer_order" : { "type": dt.INTEGER, "constraints": cst.NOT_NULL }
			},
			foreignKeys: {
				"item_id" : { "type": dt.INTEGER, "table": "items", "on": "item_id", "constraints": cst.NOT_NULL },
				"outfit_id" : { "type": dt.INTEGER, "table": "outfits", "on": "outfit_id", "constraints": cst.NOT_NULL }
			}
		},

		forums: {
			fields: {
				"forum_name" : { "type": dt.TEXT, "constraints": cst.PRIMARY_KEY },
				"forum_alias" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
			}
		},

		subforums: {
			fields: {
				"subforum_name" : { "type": dt.TEXT, "constraints": cst.PRIMARY_KEY },
				"subforum_alias" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"forum_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"forum_alias" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
			}
		},

		threads: {
			fields: {
				"thread_id" : { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"thread_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"thread_alias" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"creator_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"last_poster_name" : { "type": dt.TEXT }
			},
			foreignKeys: {
				"subforum_name" : { "type": dt.INTEGER, "table": "subforums", "on": "subforum_name", "constraints": cst.NOT_NULL },
				"creator_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id", "constraints": cst.NOT_NULL },
				"last_poster_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id" }
			},
			timestamps: true
		},

		posts: {
			fields: {
				"post_id": { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"poster_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"message_bb" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"post_color" : { "type": dt.TEXT, "constraints": cst.NOT_NULL, "default": "'#ffffff'" }
			},
			foreignKeys: {
				"thread_id" : { "type": dt.INTEGER, "table": "threads", "on": "thread_id", "constraints": cst.NOT_NULL },
				"poster_id" : { "type": dt.INTEGER, "table": "characters", "on": "character_id", "constraints": cst.NOT_NULL }
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
		},
		item_blueprints: {
			isEquippable: function(obj) {
				var category = obj.category || obj;
				return (category === "clothing" || category === "battlegear");
			}
		}
	};

	return schemas;

};