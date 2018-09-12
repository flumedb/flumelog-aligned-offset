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
      console.log(state[k].map(function (b) {
        return hexpp(b)
      }).join('\n---\n'))
    }
  }
  console.log('}')
}

tape('append a buffer', function (t) {
  var block = 256
  var state = a.initialize(block, 0, Buffer.alloc(block))
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

  b.writeUInt16LE(100, 38)
  b.fill(0xA, 40, 140)
  b.writeUInt16LE(100, 140)

  b.writeUInt16LE(100, 142)
  b.fill(0xB, 144, 244)
  b.writeUInt16LE(100, 244)

  console.log('B')
  console.log(hexpp(b))
  console.log('LAST')
  console.log(hexpp(state.buffers[0]))

  //there should be 10 bytes remaining in the buffer.
  t.equal(state.offset, 246)
  t.deepEqual(state.buffers[0], b)

  //write a buffer that overlaps the end
  var state = a.append(state, B(0x20, 20))

  b.writeUInt16LE(255, 246)
  b.writeUInt16LE(246, 256-4)

  print(state)

  t.deepEqual(state.buffers[0], b)

  var b2 = Buffer.alloc(block)

  b2.writeUInt16LE(20, 0)
  b2.fill(0x20, 2, 22)
  b2.writeUInt16LE(20, 22)

  t.deepEqual(state, {
    block: block,
    start: 0,
    offset: 256+24, written: 0, writing: 0,
    buffers: [b, b2]
  })


  t.ok(a.hasWholeWrite(state))
  var writable = a.getWritable(state = a.writable(state))
  t.deepEqual(writable, state.buffers[0])

  t.deepEqual(state, {
    block: block,
    start: 0,
    offset: 256+24, written: 0, writing: 256,
    buffers: [b, b2]
  })

  state = a.written(state)

  t.deepEqual(state, {
    block: block,
    start: 256,
    offset: 256+24, written: 256, writing: 256,
    buffers: [b2]
  })

  t.notOk(a.hasWholeWrite(state))
  var writable = a.getWritable(state = a.writable(state))
  t.equal(state.writing - state.written, 24)
  t.deepEqual(writable, b2.slice(0, 24))
  console.log(writable)
  state = a.written(state)

  t.deepEqual(state, {
    block: block,
    start: 256,
    offset: 256+24,
    written: 256+24,
    writing: 256+24,
    buffers: [b2]
  })

  t.end()
})

