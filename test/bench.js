

var FlumeLog = require('../')
var codec = require('flumecodec')
var toCompat = require('../compat')

var file = '/tmp/bench-flumelog-raf.log'
try { require('fs').unlinkSync(file) } catch (_) {}

require('bench-flumelog')(function () {
  var log = FlumeLog(file, {
    block: 1024*64,
//    codec: codec.json
  })

  return toCompat(log)
}, null, null, function (obj) {
  return obj
  //return Buffer.from(codec.json.encode(obj))
})












