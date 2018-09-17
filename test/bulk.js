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
  raf.stream({seqs: false}).pipe(collect(function (err, ary) {
    t.deepEqual(ary, a)
    t.end()
  }))
})

tape('stream, reload', function (t) {
  var raf2 = RAF(filename, {block: 64*1024})
  var ary = []
  raf.stream({seqs: false}).pipe(collect(function (err, ary) {
    t.notOk(err)
    t.deepEqual(ary, a)
    t.end()
  }))
})

tape('seqs', function (t) {
  raf.stream({}).pipe(collect(function (err, ary) {
    t.equal(ary[0].seq, 0)
    t.deepEqual(ary.map(function (e) { return e.value }), a)
      var i = ~~(ary.length*Math.random())
      console.log(ary[i])
      raf.stream({gte: ary[i].seq}).pipe(collect(function (err, _ary) {
        if(err) throw err

        t.equal(_ary.length, a.length-i)
        t.equal(_ary[0].seq, ary[i].seq)
        t.deepEqual(_ary, ary.slice(i))
        raf.stream({gt: ary[i].seq}).pipe(collect(function (err, _ary) {

          t.equal(_ary.length, a.length-(i+1))
          t.equal(_ary[0].seq, ary[i+1].seq)

          t.end()
        }))
    }))
  }))
})

tape('seqs, lte, lt', function (t) {
  raf.stream({}).pipe(collect(function (err, ary) {
    t.equal(ary[0].seq, 0)
    t.deepEqual(ary.map(function (e) { return e.value }), a)
    var i = 10//~~(ary.length*Math.random())
    raf.stream({lte: ary[i].seq}).pipe(collect(function (err, _ary) {
      if(err) throw err

      t.equal(_ary.length, i+1)
      t.equal(_ary[0].seq, ary[0].seq)
      t.deepEqual(_ary, ary.slice(0, i+1))

      raf.stream({lt: ary[i].seq}).pipe(collect(function (err, _ary) {
        t.equal(_ary.length, i)
        console.log(_ary[i-1].seq, ary[i].seq)
        t.ok(_ary[_ary.length-1].seq < ary[i].seq)
        t.equal(_ary[0].seq, 0)
        t.equal(_ary[0].seq, ary[0].seq)
        t.ok(_ary[i-1].seq < ary[i].seq)
        t.equal(_ary[0].seq, ary[0].seq, 'correct first seq')
        t.end()
      }))
    }))
  }))
})

tape('stream, reverse', function (t) {
  raf.stream({}).pipe(collect(function (err, _ary) {
    raf.stream({reverse: true, seqs: false}).pipe(collect(function (err, ary) {
      t.equal(ary[ary.length-1].seq, a[0].seq)
      t.equal(ary[0].seq, a[a.length-1].seq)
      t.equal(ary.length, a.length)
      t.equal(_ary.length, a.length)
      t.end()
    }))
  }))
})

tape('seqs, reverse, lte, lt', function (t) {
  raf.stream({}).pipe(collect(function (err, ary) {
    t.equal(ary[0].seq, 0)
    t.deepEqual(ary.map(function (e) { return e.value }), a)
    var i = 10//~~(ary.length*Math.random())
    raf.stream({lte: ary[i].seq, reverse: true}).pipe(collect(function (err, _ary) {
      if(err) throw err

      _ary = _ary.reverse()
      t.equal(_ary.length, i+1)
      t.equal(_ary[0].seq, ary[0].seq)
      t.deepEqual(_ary, ary.slice(0, i+1))
      raf.stream({lt: ary[i].seq, reverse: true}).pipe(collect(function (err, _ary) {
        t.equal(_ary.length, i)
        t.ok(_ary[_ary.length-1].seq < ary[i].seq)
        t.equal(_ary[_ary.length-1].seq, 0)
        t.equal(_ary[0].seq, ary[i-1].seq)
        t.end()
      }))
    }))
  }))
})







