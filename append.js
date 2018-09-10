exports.initialize = function (block, offset, buffer) {
  return {
    block: block,
    start: 0,
    offset: offset || 0,
    written: offset || 0,
    writing: offset || 0,
    buffers: [buffer || Buffer.alloc(block)]
  }
}

exports.append = function (state, buffer) {
  var last = state.buffers[state.buffers.length-1]
  if(!last) throw new Error('no last buffer')
  var start = state.offset%state.block
  if(start + buffer.length + 4 > state.block - 6) {
    console.log(start, state.offset, buffer.length)
    last.writeUInt16LE(state.block-1, start)
    last.writeUInt32LE(start, state.block-4)
    state.offset = ~~(start/state.block) + state.block
    start = 0
    state.buffers.push(last = Buffer.alloc(state.block))
  }
  last.writeUInt16LE(buffer.length, start)
  buffer.copy(last, start+2)
  last.writeUInt16LE(buffer.length, start+2+buffer.length)
  state.offset += 4+buffer.length

  return state
}





