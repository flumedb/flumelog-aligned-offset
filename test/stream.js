
var tape = require('tape')
var fs = require('fs')
var FlumeLogRaf = require('../')

try { fs.unlinkSync('/tmp/test-flumelog-raf') } catch (_) {}
var log = FlumeLogRaf('/tmp/test-flumelog-raf', {block: 64*1024})

function B (fill, length) {
  var b = Buffer.alloc(length)
  b.fill(fill)
  return b
}

function collect (cb) {
  return {
    array: [],
    paused: false,
    write: function (v) { this.array.push(v) },
    end: function (err) {
      this.ended = err || true
      cb(err, this.array)
    }
  }
}

tape('empty', function (t) {
  log.stream().pipe({
    paused: false,
    write: function () { throw new Error('should be empty') },
    end: t.end
  })
})

var v = B(0x10, 10)
tape('single', function (t) {
  log.append(v, function (err) {
    t.notOk(err)
    log.stream().pipe(collect(function (err, ary) {
      t.notOk(err)
      t.deepEqual(ary, [v])
      log.onDrain(t.end)
    }))
  })
})

var log2
tape('single, reload', function (t) {
  log2 = FlumeLogRaf('/tmp/test-flumelog-raf', {block: 64*1024})
  log2.stream().pipe(collect(function (err, ary) {
    t.notOk(err)
    t.deepEqual(ary, [v])
    t.end()
  }))
})
var v2 = B(0x20, 20)

tape('second', function (t) {
  log.append(v2, function (err) {
    t.notOk(err)
    log.stream().pipe(collect(function (err, ary) {
      t.notOk(err)
      t.deepEqual(ary, [v, v2])
      log.onDrain(t.end)
    }))
  })
})

