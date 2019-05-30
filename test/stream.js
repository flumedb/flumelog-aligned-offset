
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
  log.stream({seqs: false}).pipe({
    paused: false,
    write: function () { throw new Error('should be empty') },
    end: t.end
  })
})

var v1 = B(0x10, 10)
tape('single', function (t) {
  log.append(v1, function (err) {
    t.notOk(err)
    log.stream({seqs: false}).pipe(collect(function (err, ary) {
      t.notOk(err)
      t.deepEqual(ary, [v1])
      log.onDrain(t.end)
    }))
  })
})

var log2
tape('single, reload', function (t) {
  log2 = FlumeLogRaf('/tmp/test-flumelog-raf', {block: 64*1024})
  log2.stream({seqs: false}).pipe(collect(function (err, ary) {
    t.notOk(err)
    t.deepEqual(ary, [v1])
    t.end()
  }))
})
var v2 = B(0x20, 20)

tape('second', function (t) {
  log.append(v2, function (err) {
    t.notOk(err)
    log.stream({seqs: false}).pipe(collect(function (err, ary) {
      t.notOk(err)
      t.deepEqual(ary, [v1, v2])
      log.onDrain(t.end)
    }))
  })
})

var v3 = B(0x30, 30)
tape('live', function (t) {
  var sink = collect(function () {
    throw new Error('live stream should not end')
  })
  log.stream({live: true, seqs: false}).pipe(sink)
  log.append(v3, function (err) {
    
  })
  log.onDrain(function () {
    t.deepEqual(sink.array, [v1, v2, v3])
    t.end()
  })
})

tape('reverse', function (t) {
  log.stream({reverse:true, seqs: false}).pipe(collect(function (err, ary) {
    t.notOk(err)
    t.deepEqual(ary, [v3, v2, v1])
    t.end()
  }))
})


