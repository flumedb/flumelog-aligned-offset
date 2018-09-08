var pull = require('pull-stream')
var FlumeLog = require('flumelog-offset')
var fs = require('fs')
var frame = require('../frame')
var binary = require('binary')
var json = require('flumecodec/json')
var logfile = process.argv[3]
var fd = fs.openSync(logfile, 'a')
var block = 64*1024
function id (e) { return e }

var log = FlumeLog(process.argv[2], {blockSize: block, codec: json})

var a = [], length = 0
pull(
  log.stream({seqs:false, codec: json}),

  function (read) {
    read(null, function next (err, data) {
      if(data) {
        var len = binary.encodingLength(data)
        var b = Buffer.alloc(len)
        length += b.length + 4
        binary.encode(data, b, 0)
        a.push(b)
      }
      if(length > block || err) {
        var buffer = Buffer.alloc(block)
        var offsets = frame(a, block, buffer)
        fs.write(fd, buffer, 0, buffer.length, function (_err) {
          if(_err) throw _err
          a = a.slice(offsets.length)
          a = []; length = 0
          if(!err) read(null, next)
        })
      }
      else
        read(null, next)
    })
  }
)
//*/








