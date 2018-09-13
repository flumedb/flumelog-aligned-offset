var crypto = require('crypto')
var tape = require('tape')
var RAF = require('../')
var fs = require('fs')
function random () {
  return crypto.randomBytes(100 + ~~(Math.random()*1000))
}

var filename = '/tmp/test-flumelog-raf_bulk'
try { fs.unlinkSync(filename) } catch (_) { }

var raf = RAF(filename, {block: 64*1024})
var a = []

tape('insert random data', function (t) {
  for(var i = 0; i < 2000; i++) {
    var b = random()
    a.push(b)
    raf.append(b, function () {})
  }
  raf.onDrain(t.end)
})

function collect(cb) {
  var ary = []
  return {
    write: ary.push.bind(ary),
    end: function (err) {
      cb(err, ary)
    }
  }
}

tape('stream', function (t) {
  raf.stream().pipe(collect(function (err, ary) {
    t.deepEqual(ary, a)
    t.end()
  }))
})

tape('stream, reload', function (t) {
  var raf2 = RAF(filename, {block: 64*1024})
  var ary = []
  raf.stream().pipe(collect(function (err, ary) {
    t.notOk(err)
    t.deepEqual(ary, a)
    t.end()
  }))
})



