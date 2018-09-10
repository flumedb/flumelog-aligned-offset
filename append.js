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
  last.writeUInt16LE(buffer.length, start)
  buffer.copy(last, start+2)
  last.writeUInt16LE(buffer.length, start+2+buffer.length)
  state.offset += 4+buffer.length
  return state
}

