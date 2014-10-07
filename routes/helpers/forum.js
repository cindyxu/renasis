module.exports = function(utils) {
	
	var _ = utils._;
	var _str = _.str;
	var db = utils.sqlitedb;
	var userHelper = utils.userHelper;
	var debug = utils.debug;
	var schemas = utils.schemas;

	var forumHelper = {};

	forumHelper.findSubforum = function(subforumTag, page, threadsPerPage, callback) {
		debug("fetching subforum", subforumTag);
		var tagStr;
		if (isNaN(subforumTag)) tagStr = " WHERE subforums.subforum_name = ?";
		else tagStr = " WHERE subforum_id = ?";

		db.all("SELECT * FROM subforums " +
			"INNER JOIN threads ON threads.subforum_id = subforums.subforum_id" +
			tagStr +
			" ORDER BY threads.updated_at DESC LIMIT ?, ?",
			[subforumTag, ((page-1) * threadsPerPage), threadsPerPage], 
			function(err, rows) {
				if (err) { console.log(err); callback(err); return; }
				if (rows && rows.length > 0) {
					var subforum = _.pick(rows[0], schemas.fields.subforums);
					subforum.threads = rows;
					callback(undefined, subforum);
				}
				else {
					db.get("SELECT * FROM subforums " + tagStr, subforumTag, callback);
				}
			}
		);
	};

	forumHelper.findThreadWithPosts = function(threadId, startPosts, numPosts, callback) {
		// get all posts on this page

		db.all("SELECT * FROM threads INNER JOIN posts " +
			"WHERE thread_id = ? ORDER BY posts.created_at LIMIT ?, ?",
			[threadId, startPosts, numPosts], function(err, rows) {

			})

	};

	var _createThread = function(threadAlias, subforumTag, creatorId, creatorName, callback) {
		var threadName = _str.slugify(threadAlias);

		var createThreadInSubforum = function(subforumId, subforumName) {
			db.run("INSERT INTO threads (thread_name, thread_alias, subforum_id, subforum_name, creator_id, creator_name) VALUES (?, ?, ?, ?, ?, ?)",
			[threadName, threadAlias, subforumId, subforumName, creatorId, creatorName], callback);
		};

		if (isNaN(subforumTag)) {
			db.get("SELECT subforum_id FROM subforums WHERE subforum_name = ?", 
				subforumTag, function(err, subforumIdObj) {
					if (err) { console.log(err); callback(err); return; }
					createThreadInSubforum(subforumIdObj.subforum_id, subforumTag);
				}
			);
		} else {
			db.get("SELECT subforum_name FROM subforums WHERE subforum_id = ?", 
				subforumTag, function(err, subforumNameObj) {
					if (err) { console.log(err); callback(err); return; }
					createThreadInSubforum(subforumTag, subforumNameObj.subforum_name);
				}
			);
		}
	};

	forumHelper.createPost = function(messageBB, threadId, posterId, posterName, callback) {
		db.run("INSERT INTO posts (message_bb, thread_id, poster_id, poster_name) VALUES (?, ?, ?, ?)",
			[messageBB, threadId, posterId, posterName], callback);
	};

	forumHelper.createThreadWithPost = function(threadAlias, subforumTag, messageBB, creatorId, creatorName, callback) {
		debug("creating thread; name:", threadAlias, "post:", messageBB);
		db.run("BEGIN TRANSACTION", function(err) {
			_createThread(threadAlias, subforumTag, creatorId, function(err) {
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