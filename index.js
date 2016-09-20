
'use strict';

var cluster = require('cluster');

module.exports = function (workerRun) {
    var port = parseInt(process.env.PORT) || 8085;
    var numCPUs = parseInt(process.env.CLUSTER_WORKERS_COUNT, 10) || 1;
    
    if (cluster.isMaster) {
        new WorkerPool(port, numCPUs);
    } else if (cluster.isWorker) {
        workerRun();
    }
}

function portscanner(firstPort, count, done){
    var portNext = firstPort;
    var ports = [];

    var getPort = function (cb) {
        var net = require('net');
        var port = portNext;
    	portNext += 1;
        
        var server = net.createServer();
        server.listen(port, function (err) {
            server.once('close', function () {
                cb(port);
            });
            server.close();
        });
        server.on('error', function (err) {
            getPort(cb);
        });
    }
    var next = function(port){
    	ports.push(port);
    	if (ports.length >= count) {
        	done(ports);
    	} else {
		    getPort(next);
    	}
    };

    getPort(next);
}

function WorkerPool(firstPort, size) {
	var self = this;

	self._workers = [];
	self._workersMap = {};
	self._index = 0;

	portscanner(firstPort, size, function(ports){
		var size = ports.length;
	    for (var i = 0; i < size; i++) {
	    	var port = ports[i];
	    	self._createWorker(port);
	    }
	});

    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.id + ' died');
		self._restartWorker(worker.id);
    });
}

WorkerPool.prototype._createWorker = function(port) {
	var self = this;

	var index = ++self._index;
    var new_worker_env = {};
    new_worker_env["WORKER_NAME"] = "worker" + index;
    new_worker_env["PORT"] = port;
    var info = cluster.fork(new_worker_env);
    var worker = {
    	env: new_worker_env,
    	port: port,
    	index: index,
    	pid: info.process.pid,
    	id: info.id
    }
    self._workers.push(worker);
    self._workersMap[worker.id] = worker;
}

WorkerPool.prototype._restartWorker = function(workerId) {
	var self = this;
	var workerInfo = self._workersMap[workerId];
	if (!workerInfo) {
		return ;
	}
	if (cluster.workers[workerId]) {
		cluster.workers[workerId].destroy();
	}
	try { process.kill(workerInfo.pid); } catch(ex) {}

	var port = workerInfo.port;
	self._createWorker(port)
};
