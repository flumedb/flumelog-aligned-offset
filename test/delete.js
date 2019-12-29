var tape = require('tape')
var Offset = require('../')

tape('simple', function (t) {
  var file = '/tmp/offset-test_'+Date.now()+'.log'
  var db = Offset(file, {block: 64*1024})

  db.append(Buffer.from('hello world'), function (err, offset1) {
    if(err) throw err
    t.equal(offset1, db.since.value)
    //NOTE: 'hello world'.length + 8 (start frame + end frame)
    t.equal(db.since.value, 0)
    db.append(Buffer.from('hello offset db'), function (err, offset2) {
      if(err) throw err
      t.ok(offset2 > offset1)
      t.equal(offset2, db.since.value)
      db.get(offset1, function (err, b) {
        if(err) throw err
        t.equal(b.toString(), 'hello world', 'read 1st value')

        db.get(offset2, function (err, b2) {
          if(err) throw err
          t.equal(b2.toString(), 'hello offset db')
          db.del(offset1, function (err) {
            t.error(err)
            db.get(offset1, function (err) {
              t.ok(err)
              t.equal(err.message, 'item has been deleted')
              t.end()
            })
          })
        })
      })
    })
  })
})

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

tape('stream delete', function(t) {
  var file = '/tmp/offset-test_'+Date.now()+'.log'
  var db = Offset(file, {block: 64*1024})

  var b2 = Buffer.from('hello offset db')
  
  db.append(Buffer.from('hello world'), function (err, offset1) {
    if(err) throw err
    db.append(b2, function (err, offset2) {
      if(err) throw err
      db.del(offset1, function (err) {
        t.error(err)
        db.stream({seqs: false}).pipe(collect(function (err, ary) {
          t.notOk(err)
          t.deepEqual(ary, [b2])
          db.onDrain(t.end)
        }))
      })
    })
  })
})
