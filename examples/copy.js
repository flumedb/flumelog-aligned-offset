var pull = require('pull-stream')
var FlumeLog = require('flumelog-offset')
var FlumeLogRaf = require('../')
var fs = require('fs')
var frame = require('../frame')
var binary = require('bipf')
var json = require('flumecodec/json')

var block = 64*1024
function id (e) { return e }

//copy an old (flumelog-offset) log (json) to a new raf log (bipf)

if(process.argv[2] === process.argv[3]) throw new Error('input must !== output')

var log = FlumeLog(process.argv[2], {blockSize: block, codec: json})

var log2 = FlumeLogRaf (process.argv[3], {block: block})
var a = [], length = 0
pull(
  log.stream({seqs:false, codec: json}),
  pull.map(function (data) {
    var len = binary.encodingLength(data)
    var b = Buffer.alloc(len)
    length += b.length + 4
    binary.encode(data, b, 0)
    return b
  }),
  function (read) {
    read(null, function next (err, data) {
      if(err && err !== true) throw err
      if(err) return console.error('done')
      log2.append(data, function () {})
      if(log2.appendState.offset > log2.appendState.written + block*10)
        log2.onDrain(function () {
          read(null, next)
        })
      else
        read(null, next)
    })
  }

/*
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
*/
)












