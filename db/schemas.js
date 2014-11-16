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

		// login credentials
		users: {
			fields: {
				"user_id" : { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"username": { "type": dt.TEXT, "constraints": [cst.NOT_NULL, cst.UNIQUE] },
				"password_hash" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
			},
			foreignKeys: {
				"primary_character_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id" }
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

		// for the most part, something that can do things ...
		// can be npc, character, creature, pet, etc.
		entities: {
			fields: {
				"entity_id": { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"entity_name" : { "type": dt.TEXT },
				"species_alias" : { "type" : dt.TEXT, "table" : "species", "on" : "species_id", "constraints" : cst.NOT_NULL }
			},
			foreignKeys: {
				"species_id" : { "type" : dt.INTEGER, "table" : "species", "on" : "species_id", "constraints" : cst.NOT_NULL },
				"current_thread_id" : { "type" : dt.INTEGER, "table" : "threads", "on" : "thread_id" },
				"current_battle_id" : { "type" : dt.INTEGER, "table" : "battles", "on" : "battle_id" },

				"user_id" : { "type": dt.INTEGER, "table": "users", "on": "user_id" },
				"wip_outfit_id" : { "type": dt.INTEGER, "table": "outfits", "on": "outfit_id" },
				"current_outfit_id" : { "type" : dt.INTEGER, "table" : "outfits", "on" : "outfit_id" }
			},
			timestamps : true,
			triggers: { INSERT: { AFTER: [
				'UPDATE users SET primary_character_id = new.entity_id WHERE user_id = new.user_id AND primary_character_id = NULL',
				'INSERT INTO battle_stats (entity_id) VALUES (new.entity_id)'
			]}}
		},

		species: {
			fields: {
				"species_id" : { "type" : dt.INTEGER, "constraints" : [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"species_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"species_alias" : { "type": dt.TEXT, "constraints": cst.NOT_NULL }
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
				"creator_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id", "constraints": cst.NOT_NULL },
				"last_poster_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id" }
			},
			timestamps: true
		},

		posts: {
			fields: {
				"post_id": { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"poster_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"message_bb" : { "type": dt.TEXT },
				"post_color" : { "type": dt.TEXT, "constraints": cst.NOT_NULL, "default": "'#ffffff'" }
			},
			foreignKeys: {
				"thread_id" : { "type": dt.INTEGER, "table": "threads", "on": "thread_id", "constraints": cst.NOT_NULL },
				"poster_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id", "constraints": cst.NOT_NULL }
			},
			timestamps: true,
			triggers: {
				INSERT: { AFTER: [
					"UPDATE threads SET last_poster_id = new.poster_id, last_poster_name = new.poster_name WHERE thread_id = new.thread_id"
				]}
			}
		},

		// some kind of event that can happen in a subforum with some probability.
		encounters: {
			fields: {
				"chance" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL }
			},
			foreignKeys: {
				"subforum_name" : { "type" : dt.INTEGER, "table" : "subforums", "on" : "subforum_name", "constraints" : cst.NOT_NULL },
				"species_id" : { "type" : dt.INTEGER, "table" : "species", "on" : "species_id" },
				"item_blueprint_id" : { "type" : dt.INTEGER, "table" : "item_blueprints", "on" : "item_blueprint_id" }
			}
		},

		battle_steps: {
			fields : {
				// one of: "CHALLENGE", "SKILL", "ITEM", "ESCAPE"
				"action" : { "type" : dt.TEXT, "constraints" : cst.NOT_NULL },
				
				// one of: "HIT", "MISS", "ESCAPED", "TRAPPED"
				"outcome" : { "type" : dt.TEXT }
			},
			foreignKeys : {
				"post_id" : { "type" : dt.INTEGER, "table" : "posts", "on" : "post_id", "constraints" : cst.NOT_NULL },
				"actor_id" : { "type" : dt.INTEGER, "table" : "entities", "on" : "entity_id", "constraints" : cst.NOT_NULL }
			}
		},

		battle_step_affects: {
			fields: {
				"delta_hp" : { "type" : dt.INTEGER },
				"delta_mana" : { "type" : dt.INTEGER }
			},
			foreignKeys: {
				"post_id" : { "type" : dt.INTEGER, "table" : "posts", "on" : "post_id", "constraints" : cst.NOT_NULL },
				"target_id" : { "type" : dt.INTEGER, "table" : "entities", "on" : "entity_id" }
			}
		},

		// weapons, shields, etc. basically battle stats for relevant items
		battlegear_blueprints: {
			fields: {
				// required stats to equip
				"req_str" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"req_vit" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"req_dex" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"req_agi" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"req_mag" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				// stat bonuses of this weapon
				"boost_str" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"boost_vit" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"boost_dex" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"boost_agi" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 },
				"boost_mag" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 0 }
			},
			foreignKeys: {
				"item_blueprint_id" : { "type" : dt.INTEGER, "table" : "item_blueprints", "on" : "item_blueprint_id", "constraints" : cst.PRIMARY_KEY }
			}
		},

		// who/what can carry this skill?
		carriers_skills: {
			foreignKeys: {
				// if battlegear_blueprint_id != null, this skill is available when battlegear is equipped
				// if species_id != null, this skill is native to entities of that species
				"item_blueprint_id" : { "type" : dt.INTEGER, "table" : "item_blueprints", "on" : "battlegear_blueprint_id" },
				"species_id" : { "type" : dt.INTEGER, "table" : "species", "on" : "species_id" },
				"skill_id" : { "type" : dt.INTEGER, "table" : "skills", "on" : "skill_id", "constraints" : cst.NOT_NULL }
			}
		},

		// entities can learn skills, but to actually use them, 
		// they must have a weapon equipped which also has the skill,
		// unless the skill is native to the species.
		entities_skills: {
			fields: {
				// what level is the skill? does not apply to weapons.
				"level" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 }
			},
			foreignKeys: {
				"entity_id" : { "type" : dt.INTEGER, "table" : "entities", "on" : "entity_id" },
				"skill_id" : { "type" : dt.INTEGER, "table" : "skills", "on" : "skill_id", "constraints" : cst.NOT_NULL }
			}
		},

		skills: {
			fields: {
				"skill_id" : { "type" : dt.INTEGER, "constraints" : [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"skill_alias" : { "type" : dt.TEXT, "constraints" : [cst.NOT_NULL, cst.UNIQUE] },
				"skill_name" : { "type" : dt.TEXT, "constraints" : [cst.NOT_NULL, cst.UNIQUE] },
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

		skill_affects: {
			fields: {
				// TARGET, RANDOM, SELF
				"affects" : { "type" : dt.TEXT, "constraints" : cst.NOT_NULL, "default" : "TARGET" },
				"hit_formula" : { "type" : dt.TEXT },
				"critical_formula" : { "type" : dt.TEXT },
				// must expose: hp, mana, str, vit, dex, agi, mag. this will be used as eval()
				"delta_hp_formula" : { "type" : dt.TEXT },
				"delta_mana_formula" : { "type" : dt.TEXT }
				
			},
			foreignKeys: {
				"skill_id" : { "type": dt.INTEGER, "table": "skills", "on": "skill_id", "constraints" : [cst.UNIQUE, cst.NOT_NULL] },
			}
		},
		// includes debuffs
		skill_buffs: {
			fields: {
				"turns" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL },
				"affects" : { "type" : dt.TEXT, "constraints" : cst.NOT_NULL, "default" : "TARGET" },
				
				"hit_formula" : { "type" : dt.TEXT },
				
				"buff_str_formula" : { "type" : dt.TEXT },
				"buff_vit_formula" : { "type" : dt.TEXT },
				"buff_dex_formula" : { "type" : dt.TEXT },
				"buff_agi_formula" : { "type" : dt.TEXT },
				"buff_mag_formula" : { "type" : dt.TEXT }
			},
			foreignKeys: {
				"skill_id" : { "type": dt.INTEGER, "table": "skills", "on": "skill_id", "constraints" : [cst.UNIQUE, cst.NOT_NULL] },
			}
		},

		// for the most part, all entities have battle stats.
		battle_stats: {
			fields: {
				"str" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"vit" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"dex" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"agi" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 },
				"mag" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL, "default" : 1 }
			},
			foreignKeys: {
				"entity_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id", "constraints" : [cst.UNIQUE, cst.NOT_NULL] },
			},
			triggers: { INSERT: { AFTER: [
				// TODO: PROGRAMATICALLY DETERMINE HP & MANA
				"INSERT INTO battle_statuses (hp, mana, entity_id) VALUES (10, 10, new.entity_id)"
			]}}
		},

		// decides how quickly each stat will grow when skill is used.
		// "leveling up" is independent to each attribute!
		battle_stat_growths: {
			fields: {
				"growth_str" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"growth_vit" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"growth_dex" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"growth_agi" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				"growth_mag" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 0.0 },
				// growth = stat_growth / (degrade * stat_level) !! NON-ZERO
				"degrade" : { "type" : dt.REAL, "constraints" : cst.NOT_NULL, "default" : 1 }
			},
			foreignKeys: {
				"skill_id" : { "type": dt.INTEGER, "table": "skills", "on": "skill_id", "constraints" : cst.PRIMARY_KEY }
			}
		},

		// how are you doing in battle?
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
				"entity_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id", "constraints" : [cst.UNIQUE, cst.NOT_NULL] }
			}
		},

		battle_status_buffs: {
			fields: {
				"buff_str" : { "type" : dt.INTEGER },
				"buff_vit" : { "type" : dt.INTEGER },
				"buff_dex" : { "type" : dt.INTEGER },
				"buff_agi" : { "type" : dt.INTEGER },
				"buff_mag" : { "type" : dt.INTEGER }
			}
		},

		// set of items that can be equipped at once
		outfits: {
			fields: {
				"outfit_id" : { "type": dt.INTEGER, "constraints": [cst.PRIMARY_KEY, cst.AUTOINCREMENT] },
				"outfit_name" : { "type": dt.TEXT, "constraints": cst.NOT_NULL },
				"pose_str" : { "type": dt.TEXT }
			},
			foreignKeys: {
				"user_id" : { "type": dt.INTEGER, "table": "users", "on": "user_id", "constraints": cst.NOT_NULL },
				"entity_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id" }
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
				//equipped by
				"entity_id" : { "type": dt.INTEGER, "table": "entities", "on": "entity_id" }
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

		furniture_blueprints: {
			fields: {
				"base_rows" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL },
				"base_cols" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL },
				"base_offset_x" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL },
				"base_offset_y" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL },
				// bits
				"base_tiles_bits" : { "type" : dt.INTEGER, "constraints" : cst.NOT_NULL }
			},
			foreignKeys: {
				"item_blueprint_id" : { "type": dt.INTEGER, "table": "items", "on": "item_id", "constraints": cst.NOT_NULL }
			}
		}
	};

	schemas.fields = {};
	for (var k in schemas.models) {
		var model = schemas.models[k];
		if (model.fields) {
			schemas.fields[k] = Object.keys(model.fields);
		} else {
			schemas.fields[k] = [];
		}
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