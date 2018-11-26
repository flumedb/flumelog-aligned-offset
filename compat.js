var toPull = require('push-stream-to-pull-stream/source')
var Obv = require('obv')
module.exports = function toCompat(log) {
  log.since = Obv()
  log.onWrite = log.since.set

  var _stream = log.stream
  log.stream = function (opts) {
    var stream = _stream.call(log, opts)
    return toPull(stream)
  }
  return log
}

