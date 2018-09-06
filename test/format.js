
var tape = require('tape')
var fs = require('fs')
var FlumeLogRaf = require('../')

function frame (array, block, b) {
  var c = 0
  var offsets = []
  for(var i = 0; i<array.length; i++) {
    var length = array[i].length
    console.log(c, i, array[i])
    console.log(c, c+length+4, block)
    //the buffer is full, pad end.
    if(c+length+4 > block-6) {
      b.fill(0, c+2, block)
      b.writeUInt32LE(c, block-4) //write ponter to last item
      console.log(c, (block-1).toString(2))
      b.writeUInt16LE(block-1, c)
      return offsets
    }
    else {
      b.writeUInt16LE(length, c)
      array[i].copy(b, c+2, 0, length)
//      b.write(c+2, array[i])
      b.writeUInt16LE(length, c+length+4)
      offsets.push(c)
      c+=length+4
    }
  }
  return offsets
}

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

var b = Buffer.alloc(1024)
var b2 = Buffer.alloc(1024)
var offsets = frame(array, b.length, b)

frame(array.slice(4), b2.length, b2)
  .forEach(function (offset) { offsets.push(offset+1024) })

console.log(offsets)

var filename = '/tmp/flumelog-raf'
fs.writeFileSync(filename, Buffer.concat([b, b2]))

var raf = FlumeLogRaf(filename)
offsets.forEach(function (offset, i) {
  tape('item:'+i, function (t) {
    raf.get(offset, function (err, buffer, start, length) {
      var b = buffer.slice(start, start+length)
      t.deepEqual(b, array[i])
      t.end()
    })
  })
  if(false && i)
    tape('previous:'+i, function (t) {
      raf.getPrevious(offset, function (err, buffer, start, length) {
        var b = buffer.slice(start, start+length)
        raf.get(offsets[i-1], function (err, buffer, start, length) {
          var b2 = buffer.slice(start, start+length)
          t.deepEqual(b, b2)
          t.end()
        })
      })
    })
})


