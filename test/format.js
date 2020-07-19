var tape = require('tape')
var fs = require('fs')
var FlumeLogRaf = require('../')

var frame = require('../frame')
function B (fill, length) {
  var b = Buffer.alloc(length)
  b.fill(fill)
  return b
}

var array = [
  B(1, 100),
  B(2, 200),
  B(3, 300),
  B(4, 400),
  B(5, 200),
  B(6, 200),
]
var block = 1024
var b = Buffer.alloc(block)
var b2 = Buffer.alloc(block)
var offsets = frame.encode(block, array, b)

frame.encode(block, array.slice(4), b2)
  .forEach(function (offset) { offsets.push(offset+block) })

var blocks = [b, b2]

tape('records', function (t) {
  offsets.forEach(function (offset, j) {
    var i = ~~(offset/block)
    console.log(offset, offset%block, offsets)
    var result = frame.getRecord(block, blocks[i], offset%block)
    t.deepEqual(
      blocks[i].slice(result.start, result.start+result.length),
      array[j]
    )
  })
  t.end()
})

var filename = '/tmp/flumelog-raf'
fs.writeFileSync(filename, Buffer.concat([b, b2]))

var raf = FlumeLogRaf(filename, {block: 1024})
offsets.forEach(function (offset, i) {
  tape('item:'+i, function (t) {
    raf.get(offset, function (err, buffer, start, length) {
      var b = buffer//.slice(start, start+length)
      t.equal(length, array[i].length)
      console.log('L', buffer.length, start, start+length, length)
      t.equal(length, b.length)
      t.deepEqual(b.toString('hex'), array[i].toString('hex'))
      t.end()
    })
  })
  /*
  if(i + 1 < offsets.length)
    tape('next:'+i, function (t) {
      console.log('NEXT_OFFSET', offset)
      raf.getNext(offset, function (err, buffer, start, length) {
        var b = buffer//.slice(start, start+length)
        raf.get(offsets[i+1], function (err, buffer, start, length) {
          var b2 = buffer//.slice(start, start+length)
          t.deepEqual(b, b2)
          t.end()
        })
      })
    })
  */
  if(i)
    tape('previous:'+i, function (t) {
      console.log("GET_PREV", i, offsets[i])
      raf.getPrevious(offsets[i], function (err, buffer, start, length) {
        var b = buffer//.slice(start, start+length)
        console.log("GET", i, offsets[i-1])
        raf.get(offsets[i-1], function (err, buffer, start, length) {
          var b2 = buffer//.slice(start, start+length)
          t.deepEqual(b, b2)
          t.end()
        })
      })
    })
})

tape('stream', function (t) {
  var ary = []
  raf.stream({seqs: false}).pipe({
    paused: false,
    write: function (buffer) {
      console.log(buffer)
      ary.push(buffer)
    },
    end: function () {
      t.deepEqual(ary, array)
      t.end()
    }
  })
})
