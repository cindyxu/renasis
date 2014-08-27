module.exports = function(utils) {

	var db = utils.db;
	var Q = utils.Q;

	var dbitems = db.get("items");
	var itemHelper = {};

	itemHelper.fetchItemObjsPromises = function(itemIds, store) {
		return itemIds.map(function(itemId, j) {
			return itemHelper.fetchItemObjPromise(itemId, store, j);
		});
	};

	itemHelper.fetchItemObjPromise = function(itemId, store, idx) {
		var deferred = Q.defer();

		dbitems.findById(itemId, function(err, item) {
			if (err) { deferred.reject(new Error(error)); }
			else { 
				if (store) { store[idx] = item; }
				deferred.resolve(item);
			}
		});
		return deferred.promise;
	};

	return itemHelper;
};