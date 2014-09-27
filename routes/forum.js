module.exports = function(utils) {
	
	var _ = utils._;
	var db = utils.db;
	var userHelper = utils.userHelper;
	var dbThreads = db.get("threads");
	var dbUsers = db.get("users");

	var forumList = {
		"Towns" : [
			"Minishops",
			"Marketplace",
			"Town square"
		]
	};

	var THREADS_PER_PAGE = 15;
	var POSTS_PER_THREAD = 15;
	var forumExport = {};

	forumExport.newThread = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			res.render("new_thread", { "subforum" : req.params.subforum });
		});
	};

	forumExport.createThread = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			if (!userObj.curr_character) {
				res.redirect("new_character");
			}

			var subforum = req.params.subforum;
			var title = req.body.title;

			dbThreads.insert({
				"title" : title,
				"subforum" : subforum,
				"creator_id" : userObj.curr_character._id,
				"creator_name" : userObj.curr_character.name,
				"posts" : [],
				"post_count" : 0,
				"last_post_at" : new Date()
			}, function(err, thread) {
				forumExport.newPost(req, res, thread._id);
			});
		});
	};

	forumExport.getThreadWithPosts = function(threadId, firstThreadIdx, callback) {
		// get all posts on this page
		dbThreads.col.aggregate(
			{ "$match" : { "_id" : dbThreads.id(threadId) }},
			{ "$unwind" : "$posts" },
			{ "$skip" : firstThreadIdx },
			{ "$limit" : THREADS_PER_PAGE },
		function(err, postsContainer) {
			// search for characters who posted. this might be excessive ...
			// TODO: since character IDs are permanent, if we can relent on 
			// character name changes, it should be fine to just store it
			var posts = _.pluck(postsContainer, "posts");
			var posterIds = _.pluck(posts, "poster_id");
			var thread = postsContainer[0];
			delete thread.posts;
			dbUsers.find({ "_id" : { "$in" : posterIds }}, { "sort" : { "_id" : 1 }}, function(err, userObjs) {
				// assign each user to its post
				for (var i in posts) {
					var post = posts[i];
					var posterIdStr = post.poster_id.toString();
					post.user = _.find(userObjs, function(u) { return u._id.toString() === posterIdStr; });
				}
				thread.posts = posts;
				callback(err, thread);
			});
		});	
	}

	forumExport.newPost = function(req, res, threadId) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			if (!userObj.curr_character) {
				res.redirect("new_character");
				return;
			}
			var message = req.body["post-message"];
			threadId = threadId || req.body.thread_id;
			var currPage = req.body.page || 1;
			var firstThreadIdx = Math.floor(((currPage-1) * POSTS_PER_THREAD + 1) / POSTS_PER_THREAD);
			var postObj = {
				"message" : message,
				"poster_id" : userObj.curr_character._id,
				"poster_name" : userObj.curr_character.name,
			};
			dbThreads.update({ "_id" : threadId }, { 
				"$push" : { "posts" : postObj },
				"$inc" : { "post_count" : 1 },
				"$set" : { 
					"last_post_at" : new Date(), 
					"last_poster_id" : userObj.curr_character._id, 
					"last_poster_name" : userObj.curr_character.name }
			}, function(err, docs) {
				forumExport.getThreadWithPosts(threadId, firstThreadIdx, function(err, thread) {
					res.render("thread", { "thread" : thread });
				});
			});
		});
	};

	forumExport.showSubforum = function(req, res) {
		var subforum = req.params.subforum;
		var page = req.params.page || 1;
		dbThreads.find({ "subforum" : subforum }, {
			"limit" : THREADS_PER_PAGE, 
			"skip": ((page-1) * THREADS_PER_PAGE), 
			"sort" : { "last_post_at" : -1 }, 
			"fields" : { "posts" : 0 }}, 
			function(err, threads) {
				for (var i in threads) {
					threads[i].page_count = Math.ceil(threads[i].post_count / POSTS_PER_THREAD);
				}
				res.render("subforum", { "threads" : threads, "subforum" : subforum });
			}
		);
	};

	forumExport.showThread = function(req, res) {
		var subforum = req.params.subforum;
		var threadId = req.params.thread_id;
		var page = req.body.page || 1;
		forumExport.getThreadWithPosts(threadId, (page-1) * POSTS_PER_THREAD, function(err, thread) {
			res.render("thread", { "thread" : thread });
		});
	};

	forumExport.createThread = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			if (!userObj.curr_character) {
				res.redirect("new_character");
				return;
			}
		});
	}

	forumExport.createPost = function(req, res) {
		res.render("");
	}

	return forumExport;
}