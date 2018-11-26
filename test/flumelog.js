
//var pull = require('pull-stream')
var create = require('../')
var testLog = require('test-flumelog')
var toCompat = require('../compat')
//function test(name, opts, cb) {
  testLog(function (filename) {
    var raf = create(filename, {
      blockSize: 1024*64,
      codec: require('flumecodec/json')
    })

    return toCompat(raf)
  }, function () {
    console.log('done')
    //cb()
  })
//}

