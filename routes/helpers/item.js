module.exports = function(utils) {

	var db = utils.db;
	var Q = utils.Q;

	var dbItems = db.get("items");
	var dbItemBlueprints = db.get("item_blueprints");
	var itemHelper = {};

	// pass in an array of item ids - will populate store with item objects
	itemHelper.fetchItemObjsPromises = function(itemIds, store) {
		return itemIds.map(function(itemId, j) {
			return itemHelper.fetchItemObjPromise(itemId, store, j);
		});
	};

	itemHelper.fetchItemObjPromise = function(itemId, store, idx) {
		var deferred = Q.defer();

		dbItems.findById(itemId, function(err, item) {
			if (err) { deferred.reject(new Error(error)); }
			else { 
				dbItemBlueprints.findById(item.blueprint_id, function(err, itemBlueprint) {
					if (err) { 
						deferred.reject(new Error(error));
					} else {
						item.blueprint = itemBlueprint;
						if (store) {
							if (store[idx]) {
								store[idx].item = item;	
							}
							else {
								store[idx] = item;
							}
						}
						deferred.resolve(item);
					}
				});
			}
		});
		return deferred.promise;
	};
	
	return itemHelper;
};