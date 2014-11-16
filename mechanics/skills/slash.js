module.exports = function(utils) {

	var skillsHelper = utils.skillsHelper;
	// parties: actor, target, allies, enemies

	var slashSkill = {
		enact: [
			function(battle) {
				var actor = battle.actor;
				var target = battle.target;

				var attack = skillHelper.getAttack(actor);
				var defense = skillHelper.getDefense(target);

				var dmg = Math.max(attack - defense, 0);
				
				return {
					"target" : {
						"target_delta_hp" : dmg
					}
				};
			}
		]
	};

	return slashSkill;

};