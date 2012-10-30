
module.exports = function(nt, obj) {
  var proxy = nt.tools.proxy;

  var bytesWritten = 0;
  var bytesRead = 0;

  setInterval(function() {
    nt.metric('Network', 'Data sent per minute', bytesWritten / 1000, 'KB', 'avg');
    nt.metric('Network', 'Data received per minute', bytesRead / 1000, 'KB', 'avg');

    bytesWritten = bytesRead = 0;
  }, 60000);


  proxy.after(obj, ['connect', 'createConnection'], function(obj, args, ret) {
    var socket = ret;

    proxy.before(ret, ['write', 'end'], function(obj, args) {
      bytesWritten += socket.bytesWritten || 0;
      nt.appData.bytesWritten += socket.bytesWritten || 0;
    });
  
    proxy.before(ret, 'on', function(obj, args) {
      if(args.length < 1 || args[0] !== 'data') return;
  
      proxy.callback(args, -1, function(obj, args) {  
        bytesRead += socket.bytesRead || 0;
        nt.appData.bytesRead += socket.bytesRead || 0;
      });
    });
  });
};

