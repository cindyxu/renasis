(function() {

	// Baseline setup
	// --------------

	// Establish the root object, `window` in the browser, or `exports` on the server.
	var root = this;

	var schemas = {};

	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = schemas;
		}
		exports.schemas = schemas;
	} else {
		root.schemas = schemas;
	}

	schemas.fields = {
		users: ['user_id', 'username', 'password_hash', 'primary_character_id', 'created_at', 'updated_at'],
		characters: ['character_id', 'character_name', 'user_id', 'wip_outfit_id', 'current_outfit_id', 'created_at', 'updated_at'],
		outfits: ['outfit_id', 'user_id', 'character_id', 'outfit_name', 'pose_str'],
		item_blueprints: ['item_blueprint_id', 'item_name', 'item_alias', 'category', 'subcategory'],
		items: ['item_blueprint_id', 'item_alias', 'item_id', 'user_id', 'created_at', 'updated_at'],
		item_equip_options: ['item_blueprint_id', 'varieties', 'poses_str'],
		item_equips: ['item_equip_id', 'item_id', 'outfit_id', 'item_alias', 'variety', 'layer', 'layer_order'],
		preferences: ['user_id', 'preferences_id', 'sound_music_level', 'sound_fx_level', 'threads_per_page', 'posts_per_page'],
		subforums: ['subforum_id', 'subforum_name', 'subforum_alias'],
		threads: ['thread_id', 'thread_name', 'thread_alias', 'creator_id', 'creator_name', 'last_poster_id', 'last_poster_name', 'subforum_id', 'subforum_name', 'created_at', 'updated_at', 'last_post_at']
	};

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

}.call(this));