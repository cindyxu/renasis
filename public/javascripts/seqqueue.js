(function() {

	// Baseline setup
	// --------------

	// Establish the root object, `window` in the browser, or `exports` on the server.
	var root = this;

	var seqqueue = {};

	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = seqqueue;
		}
		exports.seqqueue = seqqueue;
	} else {
		root.seqqueue = seqqueue;
	}

	seqqueue.newQueue = function() {

		var queue = {};
		var _queueArr = [];
		var _running = false;

		queue.insert = function(req) {
			console.log("inserted new function; queue length = " + _queueArr.length);
			_queueArr.push(req);
			if (!_running) {
				queue.executeNext();
			}
		};

		queue.executeNext = function() {
			console.log("executing next function; queue length = " + _queueArr.length);
			_running = true;
			var req = _queueArr.splice(0, 1)[0];
			req.execute(callbackFunctor(req.respond));
		};

		queue.isRunning = function() {
			return _running;
		};

		queue.cancelAll = function() {
			while (_queueArr.length > 0) {
				_queueArr.pop();
			}
			_running = false;
		};

		var callbackFunctor = function(respond) {
			return function(res) {
				if (respond) respond(res);
				console.log("done with function; queue length = " + _queueArr.length);
				if (_queueArr.length > 0) {
					queue.executeNext();
				} else {
					_running = false;
				}
			};
		};

		return queue;
	};

}.call(this));