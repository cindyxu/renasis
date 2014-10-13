module.exports = function(utils) {
	
	var _ = utils._;
	var _str = _.str;
	var db = utils.sqlitedb;
	var userHelper = utils.userHelper;
	var debug = utils.debug;
	var schemas = utils.schemas;

	var forumHelper = {};

	forumHelper.findSubforumWithThreads = function(subforumName, page, threadsPerPage, callback) {
		debug("fetching subforum", subforumName);
		db.all("SELECT * FROM subforums " +
			"INNER JOIN threads ON threads.subforum_name = subforums.subforum_name" +
			"WHERE subforum_name = ?" +
			" ORDER BY threads.updated_at DESC LIMIT ?, ?",
			[subforumName, ((page-1) * threadsPerPage), threadsPerPage], 
			function(err, rows) {
				if (err) { console.log(err); callback(err); return; }
				if (rows && rows.length > 0) {
					var subforum = _.pick(rows[0], schemas.fields.subforums);
					subforum.threads = rows;
					callback(undefined, subforum);
				}
				else {
					db.get("SELECT * FROM subforums WHERE subforum_name = ?", subforumName, callback);
				}
			}
		);
	};

	forumHelper.findThreadWithPosts = function(threadId, startPosts, numPosts, callback) {
		// get all posts on this page
		db.all("SELECT * FROM threads INNER JOIN posts " +
			"WHERE threads.thread_id = ? ORDER BY posts.created_at LIMIT ?, ?",
			[threadId, startPosts, numPosts], function(err, rows) {
				if (err) { console.log(err); callback(err); return; }
				var thread = _.pick(rows[0], schemas.fields.threads);
				thread.posts = rows;
				callback(undefined, thread);
			}
		);
	};

	var _createThread = function(threadAlias, subforumName, creatorId, creatorName, callback) {
		var threadName = _str.slugify(threadAlias);
		db.run("INSERT INTO threads (thread_name, thread_alias, subforum_name, creator_id, creator_name) VALUES (?, ?, ?, ?, ?, ?)",
		[threadName, threadAlias, subforumName, creatorId, creatorName], callback);
	};

	forumHelper.createPost = function(messageBB, threadId, posterId, posterName, callback) {
		db.run("INSERT INTO posts (message_bb, thread_id, poster_id, poster_name) VALUES (?, ?, ?, ?)",
			[messageBB, threadId, posterId, posterName], callback);
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