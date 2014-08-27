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

module.exports.smsplash = function(req, res){
	res.render('smsplash', { title: 'Express' });
};