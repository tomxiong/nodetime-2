
module.exports = function(nt, obj) {
  var typeServer = 'HTTP Server';
  var typeClient = 'HTTP Client';

  var proxy = nt.tools.proxy;
  var samples = nt.tools.samples;

  // server probe
  proxy.before(obj.Server.prototype, ['on', 'addListener'], function(obj, args) {
    if(args[0] !== 'request') return;

    proxy.callback(args, -1, function(obj, args) {
      var req = args[0];
      var res = args[1];
      var time = samples.time(typeServer, req.url, true);

      proxy.after(res, 'end', function(obj, args) {
        if(!time.done()) return;
        if(samples.skip(time)) return;

        var sample = samples.sample();
        sample['Type'] = typeServer;
        sample['Method'] = req.method;
        sample['URL'] = req.url;
        sample['Request headers'] = req.headers;
        sample['Status code'] = res.statusCode;
        sample._group = typeServer + ': ' + req.method;
        sample._label = req.url;

        samples.add(time, sample);
      });
    });
  });


  // client error probe
  proxy.after(obj, 'request', function(obj, args, ret) {
    var time = undefined;
    var trace = samples.stackTrace();
    var opts = args[0];
    
    // exclude agent.io communication
    if(opts && opts.headers && opts.headers['agentio-version']) return;

    proxy.before(ret, 'end', function(obj, args) {
      time = opts.__time__ = !opts.__time__ ? samples.time(typeClient, opts.method || 'GET') : undefined;
    });

    proxy.before(ret, ['on', 'addListener'], function(obj, args) {
      if(args[0] !== 'error') return;

      proxy.callback(args, -1, function(obj, args) {
        if(!time || !time.done(proxy.hasError(args))) return;
        if(samples.skip(time)) return;

        var error = proxy.getErrorMessage(args);
        var sample = samples.sample();
        sample['Type'] = typeClient;
        sample['Method'] = opts.method;
        sample['URL'] = 
          (opts.hostname || opts.host) + 
          (opts.port ? ':' + opts.port : '') + 
          (opts.path || '/');
        sample['Request headers'] = opts.headers;
        sample['Stack trace'] = trace;
        sample['Error'] = error;
        sample._group = typeClient + ': ' + opts.method;
        sample._label = typeClient + ': ' + sample.URL;

        samples.add(time, sample);
      });   
    });
  });


  // client probe
  proxy.before(obj, 'request', function(obj, args) {
    var trace = samples.stackTrace();
    var opts = args[0];
 
    // exclude agent.io communication
    if(opts && opts.headers && opts.headers['agentio-version']) return;

    proxy.callback(args, -1, function(obj, args) {
      var res = args[0];
      proxy.before(res, ['on', 'addListener'], function(obj, args) {
        if(args[0] !== 'end') return;
        
        proxy.callback(args, -1, function(obj, args) {
	        var time = opts.__time__;
          if(!time || !time.done()) return;
          if(samples.skip(time)) return;

          var sample = samples.sample();
          sample['Type'] = typeClient; 
          sample['Method'] = opts.method;
          sample['URL'] = 
            (opts.hostname || opts.host) + 
            (opts.port ? ':' + opts.port : '') + 
            (opts.path || '/');
          sample['Request headers'] = opts.headers; 
          sample['Response headers'] = res.headers; 
          sample['Status code'] = res.statusCode;
          sample['Stack trace'] = trace;
          sample._group = typeClient + ': ' + opts.method;
          sample._label = typeClient + ': ' + sample.URL;

          samples.add(time, sample);
        });
      });
    });
  });
};


