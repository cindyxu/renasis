module.exports.smforum = function(req, res){
	res.render('smforum', { title: 'Express' });
};

module.exports.smthread = function(req, res){
	res.render('smthread', { title: 'Express' });
};

module.exports.smforumthreads = function(req, res){
	res.render('smforumthreads', { title: 'Express' });
};

module.exports.smprof = function(req, res){
	res.render('smprof', { title: 'Express' });
};

module.exports.login = function(req, res){
	res.render('login', { title: 'Express' });
};

module.exports.signup = function(req, res){
	res.render('signup', { title: 'Express' });
};