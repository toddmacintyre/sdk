var fs = require('fs');
var path = require('path')

var dir = 'build/messages/src/components/';
var output = 'locale/en.js';
var info = {};

fs.readdir(dir, function(err, files) {
  if (err) {
    throw err;
  }
  var c = 0;
  files.forEach(function(file) {
    if (path.extname(file) === '.json') {
      c++;
      fs.readFile(dir + file, 'utf-8', function(err,src) {
        if (err) {
          throw err;
        }
        var obj = JSON.parse(src);
        for (var i = 0, ii = obj.length; i < ii; ++i) {
          info[obj[i].id] = obj[i].defaultMessage;
        }
        if (0 === --c) {
          const ordered = {};
          Object.keys(info).sort().forEach(function(key) {
            ordered[key] = info[key];
          });
          var result = 'var enMessages = ' + JSON.stringify(ordered, null, '  ') + ';\nexport default enMessages;\n';
          fs.writeFileSync(output, result);
        }
      });
    }
  });
});
