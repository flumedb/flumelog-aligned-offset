var crypto = require('crypto')
var RAF = require('../')
var tape = require('tape')
var fs = require('fs')

var filename = '/tmp/test-flumelog-raf_bulk2'
try {
  fs.unlinkSync(filename)
} catch (_) { }

var raf = RAF(filename, {block: 2*1024, codec: require('flumecodec').json})
var a = [], ary = [], N = 100

function random (i) {
  var b = Buffer.alloc(100 + ~~(Math.random()*1000))
  b.fill('abcdefghijklmnopqrztuvwxyz'[i%26])
  b.writeUInt32BE(i, 0)
  return {
    key: i, value: Math.random(),
  }
  return b
}

//function collect(cb) {
//  var ary = []
//  return {
//    write: ary.push.bind(ary),
//    end: function (err) {
//      cb(err, ary)
//    }
//  }
//}

raf.stream({live: true}).pipe({
  write: function (data) {
    console.log("DATA", data.seq)
    ary.push(data)
  },
  end: function () {
    throw new Error('live stream should not end')
  }
})

var a = []

tape('insert random data', function (t) {
  ;(function next (i) {
    if(i > N) return raf.onDrain(t.end)
    var b = random(i)
    a.push(b)
    console.log("APPEND", i)
    raf.append(b, function () {
      next(i+1)
    })
  })(0)

})

tape('end', function (t) {
  setTimeout(function () {
    t.deepEqual(ary.length, a.length)
    t.end()
  }, 1000)
})

