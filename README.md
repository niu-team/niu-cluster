niu-cluster
----------

同时启动多个实例，监听多个端口

端口号自增

### 配置环境变量

```
PORT=8080
CLUSTER_WORKERS_COUNT=2
```

### 例子

```
var yog = require('yog2-kernel');
var niuCluster = require('niu-cluster');

niuCluster(function(){
	console.log('worker start ' + process.env.WORKER_NAME);

    var app = yog.bootstrap({
        rootPath: __dirname
    }, function () {
        console.log('plugins load completed');
    });

    app.set('port', process.env.PORT);
    app.disable('x-powered-by');

    var server = yog.server = app.listen(app.get('port'), function () {
        console.log('Yog server listening on port ' + server.address().port);
    });

    server.on('connection', function (socket) {
        // disable nagle
        socket.setNoDelay(true);
    });

    // 仅在 Node.js 6.x开启这个功能 https://github.com/nodejs/node/issues/7126
    if (parseInt(process.versions.node.split('.')[0], 10) >= 6) {
        server.on('clientError', function (err, socket) {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
    }
});
```
