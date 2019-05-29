var FlumeLogRaf = require('../')
var raf = FlumeLogRaf(process.argv[2], {block: 64*1024})

// just write a raf log to stdout and see how long it takes.
// I'm getting 2.5 seconds to dump 431 mb file (created using copy.js)

var start = Date.now(), count = 0
raf.stream({reverse: false, seqs: false}).pipe({
  paused: false,
  write: function (buffer) {
    count++
    var len = Buffer.allocUnsafe(4)
    len.writeUInt32LE(buffer.length, 0)
    process.stdout.cork()
    process.stdout.write(len)
    process.stdout.write(buffer)
    process.stdout.uncork()
  },
  end: function () {
    console.error(count, Date.now()-start)
  }
})

