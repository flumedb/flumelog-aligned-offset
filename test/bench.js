

var FlumeLog = require('../')
var codec = require('flumecodec')
var toCompat = require('../compat')

require('bench-flumelog')(function () {
  var log = FlumeLog('/tmp/bench-flumelog-raf_' + Date.now(), {
    block: 1024*64,
    codec: codec.json
  })

  return toCompat(log)
}, null, null, function (obj) {
  return obj
  //return Buffer.from(codec.json.encode(obj))
})











