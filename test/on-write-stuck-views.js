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

var file = '/tmp/fao-test_onwrite.log'
var blockSize = 300

var v1 = { v: 'hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world hello world' } 
var v2 = { v: 'hello world hello world 2 hello world hello world 2 hello world hello world 2 hello world hello world 2 hello world hello world 2 hello world hello world 2 hello world hello world 2' }
var v3 = { v: 'hello world hello world 3 hello world hello world 3 hello world hello world 3 hello world hello world 3 hello world hello world 3 hello world hello world 3' }
var v4 = { v: 'hello world 4' }

var lastOffset = 0

tape('first writes', function (t) {
  try { fs.unlinkSync(file) } catch (_) {}
  let db = Offset(file, {
    block: blockSize,
    codec: require('flumecodec/json')
  })
  
  db.append(v1, function (err, offset1) {
    if(err) throw err
    t.equal(offset1, db.since.value)
    t.equal(db.since.value, 0)

    db.append(v2, function (err, offset2) {
      if(err) throw err
      t.equal(offset2, db.since.value)
      
      db.append(v3, function (err, offset3) {
        if(err) throw err
        t.equal(offset3, db.since.value)

        lastOffset = offset3

        db.stream({seqs: false}).pipe(collect(function (err, ary) {
          t.deepEqual(ary, [v1, v2, v3])

          //if we don't do a close here, the last write will not be written correctly
          //db.close(t.end)

          // simulate a crash so that the block write can't be written
          db.canWrite = false

          t.end()
        }))
      })
    })
  })
})

tape('get data after crash write', function (t) {
  let db2 = Offset(file, {
    block: blockSize,
    codec: require('flumecodec/json')
  })

  db2.onWrite = function(offset) {
    console.log("length", db2.length)
    console.log("onwrite offset", offset)
    console.log("last offset", lastOffset)
    console.log("===========")

    db2.stream({seqs: true}).pipe(collect(function (err, ary) {
      t.equal(offset, ary[ary.length-1].seq)
      t.end()
    }))
  }
})
