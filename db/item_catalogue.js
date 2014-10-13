module.exports = {
	"clothing": {
		"base" : [
			{
				"item_name" : "human1",
				"item_alias" : "human1",

				"equip_options" : {
					"varieties" : "human1",
					"poses_str" : 
						"arm_above:(0:41,63);head:(0:25,38);torso:(0:31,60);leg_behind:(0:28,75);arm_behind:(0:27,63);leg_above:(0:38,76)"
				}
			}
		],
		"hair" : [
			{
				"item_name" : "miko",
				"item_alias" : "miko",

				"equip_options" : {
					"varieties" : "pink",
					"poses_str" : 
						"head:(0:20,37);behind:(0:23,36)"
				}
			},
			{
				"item_name" : "static",
				"item_alias" : "static",

				"equip_options" : {
					"varieties" : "blue,black",
					"poses_str" : "head:(0:22,35)"
				}
			},
			{
				"item_name" : "mermaid",
				"item_alias" : "mermaid",

				"equip_options" : {
					"varieties" : "aquamarine",
					"poses_str" : "head:(0:18,35)"
				},
			}
		],
		"face" : [
			{
				"item_name" : "unimpressed",
				"item_alias" : "unimpressed",

				"equip_options" : {
					"varieties" : "yellow",
					"poses_str" : "head:(0:28,50)"
				}
			}
		],
		"head" : [
			{
				"item_name" : "fox_ears",
				"item_alias" : "fox ears",

				"equip_options" : {
					"varieties" : "red",
					"poses_str" : 
						"head:(0:42,34);behind:(0:22,34)"
				}
			},
			{
				"item_name" : "roses",
				"item_alias" : "roses",

				"equip_options" : {
					"varieties" : "red",
					"poses_str" : 
						"head:(0:41,37);behind:(0:22,37)"
				}
			}
		],
		"top" : [
			{
				"item_name" : "sweater",
				"item_alias" : "sweater",

				"equip_options" : {
					"varieties" : "salmon",
					"poses_str" : 
						"arm_above:(0:33,63);leg_above:(0:30,68);arm_behind:(0:27,67)"
				}
			},
			{
				"item_name" : "shirt",
				"item_alias" : "shirt",

				"equip_options" : {
					"varieties" : "black",
					"poses_str" : 
						"arm_above:(0:40,64);leg_above:(0:30,65);arm_behind:(0:31,64)"
				}
			},
			{
				"item_name" : "tank_top",
				"item_alias" : "tank top",

				"equip_options" : {
					"varieties" : "teal",
					"poses_str" : 
						"arm_above:(0:35,63);leg_above:(0:30,68)"
				}
			}
		],
		"bottom" : [
			{
				"item_name" : "jeans",
				"item_alias" : "jeans",

				"equip_options" : {
					"varieties" : "navy",
					"poses_str" : 
						"leg_above:(0:30,76)"
				}
			}
		],
		"feet" : [
			{
				"item_name" : "sneakers",
				"item_alias" : "sneakers",

				"equip_options" : {
					"varieties" : "red",
					"poses_str" : 
						"leg_above:(0:28,87)"
				}
			}
		],
		"back" : [
			{
				"item_name" : "wings",
				"item_alias" : "wings",

				"equip_options" : {
					"varieties" : "periwinkle",
					"poses_str" : 
						"back:(0:18,42)"
				}
			}
		]
	},
	"battlegear" : {
		"hand" : [
			{
				"item_name" : "sword",
				"item_alias" : "sword",

				"equip_options" : {
					"varieties" : "silver",
					"poses_str" : "arm_behind:(0:6,75)"
				},

				"battlegear" : {
					"str_base": 1,
					"str_mult": 0,
				
					"vit_base": 0,
					"vit_mult": 0,
				
					"dex_base": 0,
					"dex_mult": 0,
				
					"agi_base": 0,
					"agi_mult": 0,
				
					"mag_base": 0,
					"mag_mult": 0,

					"skills" : ["slash"]
				}
			}
		]
	}
};