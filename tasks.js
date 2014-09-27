module.exports = function(db) {
	var taskExports = {};
	taskExports.recreateTables = function() {
		db.run("DROP TABLE IF EXISTS users");
		db.run("DROP TABLE IF EXISTS characters");
		db.run("DROP TABLE IF EXISTS avatars");

		db.run("CREATE TABLE users (id INT NOT NULL, username TEXT NOT NULL, PRIMARY KEY (id))");
	};
	return taskExports;
};