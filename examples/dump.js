var FlumeLogRaf = require('../')
var raf = FlumeLogRaf(process.argv[2], {block: 64*1024})

var start = Date.now(), count = 0
raf.stream().pipe({
  paused: false,
  write: function (buffer) {
    count++
    var len = Buffer.allocUnsafe(4)
    len.writeUInt32LE(buffer.length, 0)
    process.stdout.write(len)
    process.stdout.write(buffer)
  },
  end: function () {
    console.error(count, Date.now()-start)
  }
})











