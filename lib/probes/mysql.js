
module.exports = function(nt, obj) {
  var proxy = nt.tools.proxy;
  var samples = nt.tools.samples;
  var type = 'MySQL';

  proxy.after(obj, 'createClient', function(obj, args, ret) {
    var client = ret;

    proxy.before(client, 'query', function(obj, args) {
      var trace = samples.stackTrace();
      var command = args.length > 0 ? args[0] : undefined;
      var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
      var time = samples.time(type, "query");

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done(proxy.hasError(args))) return;
        if(samples.skip(time)) return;

        var error = proxy.getErrorMessage(args);
        var sample = samples.sample();
        sample['Type'] = type;
        sample['Connection': {
          host: client.host, 
          port: client.port, 
          user: client.user, 
          database: client.database !== '' ? client.database : undefined};
        sample['Command'] = samples.truncate(command);
        sample['Arguments'] = samples.truncate(params);
        sample['Stack trace'] = trace;
        sample['Error'] = error;
        sample._group = type + ': ' + sample['Command'];
        sample._label = type + ': ' + sample['Command'];

        samples.add(time, sample);
      });
    });
  });
};

