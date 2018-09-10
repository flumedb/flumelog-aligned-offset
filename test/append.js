var hexpp = require('hexpp')
var tape = require('tape')
var a = require('../append')

function B (fill, length) {
  var b = Buffer.alloc(length)
  b.fill(fill)
  return b
}

function print (state) {
  console.log('State {')
  for(var k in state) {
    if(!Array.isArray(state[k]))
      console.log('  '+k+':', state[k])
    else {
      console.log('  '+k+':')
      state[k].forEach(function (b) {
        console.log(hexpp(b))
      })
    }
  }
  console.log('}')
}

tape('append a buffer', function (t) {
  var block = 256
  var state = a.initialize(block, 0)
  t.deepEqual({
    block: block,
    start: 0,
    offset: 0, written: 0, writing: 0,
    buffers: [Buffer.alloc(block)]
  }, state)

  var state = a.append(state, B(1, 20))
  var b = Buffer.alloc(block)

  b.writeUInt16LE(20, 0)
  b.fill(1, 2, 22)
  b.writeUInt16LE(20, 22)

  t.deepEqual(state, {
    block: block,
    start: 0,
    offset: 24, written: 0, writing: 0,
    buffers: [b]
  })
  print(state)

  b.writeUInt16LE(10, 24)
  b.fill(2, 26, 36)
  b.writeUInt16LE(10, 36)

  var state = a.append(state, B(2, 10))

  t.deepEqual(state, {
    block: block,
    start: 0,
    offset: 38, written: 0, writing: 0,
    buffers: [b]
  })

  var state = a.append(state, B(0xA, 100))
  var state = a.append(state, B(0xB, 100))

  //there should be 10 bytes remaining in the buffer.
  

  print(state)
  t.equal(state.offset, 246)

  t.end()
})




