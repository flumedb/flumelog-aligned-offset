var tape = require('tape')
var fs = require('fs')
var Offset = require('../')
var toCompat = require('../compat')

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

var v1 = { v: 'hello world hello world' } 
var v2 = { v: 'hello world hello world 2' }

tape('simple', function (t) {
  var file = '/tmp/fao-test_restart.log'
  try { fs.unlinkSync(file) } catch (_) {}
  var db = Offset(file, {
    block: 16*1024,
    codec: require('flumecodec/json')
  })
  
  db.append(v1, function (err, offset1) {
    if(err) throw err
    t.equal(offset1, db.since.value)
    t.equal(db.since.value, 0)
    db.append(v2, function (err, offset2) {
      if(err) throw err
      t.equal(offset2, db.since.value)
      
      db.stream({seqs: false}).pipe(collect(function (err, ary) {
        t.deepEqual(ary, [v1, v2])
        //console.log(ary)
      }))
      
      t.end()
    })
  })
})

tape('simple reread', function (t) {
  var file = '/tmp/fao-test_restart.log'
  var db = Offset(file, {
    block: 16*1024,
    codec: require('flumecodec/json')
  })

  db.onReady(() => {
    db.stream({seqs: false}).pipe(collect(function (err, ary) {
      t.deepEqual(ary, [v1, v2])
    }))

    t.end()
  })
})
