module.exports = function(utils) {
	
	var _ = utils._;
	var _str = _.str;
	var db = utils.db;
	var userHelper = utils.userHelper;
	var debug = utils.debug;
	var schemas = utils.schemas;

	var forumHelper = {};

	forumHelper.findSubforumWithThreads = function(subforumName, page, threadsPerPage, callback) {
		debug("fetching subforum", subforumName);
		db.all('SELECT * FROM subforums ' +
			'LEFT JOIN threads ON threads.subforum_name = subforums.subforum_name ' +
			'WHERE subforums.subforum_name = ? ' +
			'ORDER BY threads.updated_at DESC LIMIT ?, ?',
			[subforumName, ((page-1) * threadsPerPage), threadsPerPage], 
			function(err, rows) {
				if (err) { console.log(err); callback(err); return; }
				if (rows && rows.length > 0) {
					var subforum = _.pick(rows[0], schemas.fields.subforums);
					subforum.threads = rows;
					callback(undefined, subforum);
				}
				else {
					callback();
				}
			}
		);
	};

	forumHelper.findPost = function(postId, callback) {
		db.get('SELECT *, posts.post_id FROM posts ' +
			'LEFT JOIN battle_steps ON battle_steps.post_id = posts.post_id ' +
			'WHERE post_id = ?', postId, callback);
	};

	forumHelper.findThreadWithPosts = function(threadId, startPost, numPosts, callback) {
		// get all posts on this page + battle steps
		// NOTE must reselect posts.post_id because if battle_steps is null,
		// post_id gets overwritten as null
		db.all('SELECT threads.*, posts.*, battle_steps.*, posts.post_id, ' + 
			'actors.species_alias AS actor_species_alias, actors.entity_name AS actor_entity_name, ' +
			'targets.species_alias AS target_species_alias, targets.entity_name AS target_entity_name ' +
			'FROM threads ' +
			'INNER JOIN posts ON posts.thread_id = threads.thread_id ' +
			// battle steps. uggh is there any way to not do this here ...
			'LEFT JOIN (battle_steps ' + 
				'LEFT JOIN entities AS actors ON actors.entity_id = battle_steps.actor_id ' +
				'LEFT JOIN entities AS targets ON targets.entity_id = battle_steps.target_id) ' +
			'ON battle_steps.post_id = posts.post_id ' +
			'WHERE threads.thread_id = ? ORDER BY posts.created_at LIMIT ?, ?',
			[threadId, startPost, numPosts], function(err, rows) {
				console.log(rows);
				if (err) { console.log(err); callback(err); return; }
				var thread = _.pick(rows[0], schemas.fields.threads);
				thread.posts = rows;
				callback(undefined, thread);
			}
		);
	};

	// todo: generalize WHEN NEED ARISES
	forumHelper.findThreadWithPostsAfter = function(threadId, startId, callback) {
		db.all('SELECT threads.*, posts.*, battle_steps.*, posts.post_id, ' + 
			'actors.species_alias AS actor_species_alias, actors.entity_name AS actor_entity_name, ' +
			'targets.species_alias AS target_species_alias, targets.entity_name AS target_entity_name ' +
			'FROM threads ' +
			'INNER JOIN posts ON posts.thread_id = threads.thread_id ' +
			'LEFT JOIN (battle_steps ' + 
				'LEFT JOIN entities AS actors ON actors.entity_id = battle_steps.actor_id ' +
				'LEFT JOIN entities AS targets ON targets.entity_id = battle_steps.target_id) ' +
			'ON battle_steps.post_id = posts.post_id ' +
			'WHERE threads.thread_id = ? AND posts.post_id > ? ORDER BY posts.created_at',
			[threadId, startId], function(err, rows) {
				console.log(rows);
				if (err) { console.log(err); callback(err); return; }
				var thread = _.pick(rows[0], schemas.fields.threads);
				thread.posts = rows;
				callback(undefined, thread);
			}
		);
	};

	var _createThread = function(threadAlias, subforumName, creatorId, creatorName, callback) {
		var threadName = _str.slugify(threadAlias);
		db.run("INSERT INTO threads (thread_name, thread_alias, subforum_name, creator_id, creator_name) VALUES (?, ?, ?, ?, ?)",
		[threadName, threadAlias, subforumName, creatorId, creatorName], callback);
	};

	forumHelper.createPost = function(messageBB, threadId, posterId, posterName, callback) {
		db.run("INSERT INTO posts (message_bb, thread_id, poster_id, poster_name) VALUES (?, ?, ?, ?)",
			[messageBB, threadId, posterId, posterName], function(err) {
				var postId = this.lastID;
				callback(undefined, {
					"post_id" : postId
				});
			}
		);
	};

	forumHelper.createThreadWithPost = function(threadAlias, messageBB, subforumName, creatorId, creatorName, callback) {
		debug("creating thread; name:", threadAlias, "post:", messageBB, "by:", creatorName);
		db.run("BEGIN TRANSACTION", function(err) {
			_createThread(threadAlias, subforumName, creatorId, creatorName, function(err) {
				if (err) { console.log(err); callback(err); return; }
				var threadId = this.lastID;
				forumHelper.createPost(messageBB, threadId, creatorId, creatorName, function(err) {
					if (err) { console.log(err); callback(err); return; }
					var postId = this.lastID;
					db.run("COMMIT", function(err) {
						if (err) { console.log(err); callback(err); return; }
						else callback(undefined, {
							"thread_id" : threadId,
							"post_id" : postId
						});
					});
				});
			});
		});
	};

	return forumHelper;
};