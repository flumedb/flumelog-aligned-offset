exports.initialize = function (block, offset, buffer) {
  return {
    block: block,
    start: 0,
    offset: offset || 0,
    written: offset || 0,
    writing: offset || 0,
    buffers: [buffer]
  }
}

exports.append = function (state, buffer) {
  var last = state.buffers[state.buffers.length-1]
  if(!last) throw new Error('no last buffer')
  var start = state.offset%state.block
  if(start + buffer.length + 4 > state.block - 6) {
    last.writeUInt16LE(state.block-1, start)
    last.writeUInt32LE(start, state.block-4)
    state.offset = nextBlock(start, state.block)
    start = 0
    state.buffers.push(last = Buffer.alloc(state.block))
  }
  last.writeUInt16LE(buffer.length, start)
  buffer.copy(last, start+2)
  last.writeUInt16LE(buffer.length, start+2+buffer.length)
  state.offset += 4+buffer.length

  return state
}

//to write data, get the next write block
function startBlock (offset, block) {
  return (offset - offset%block)
}

function nextBlock(offset, block) {
  return startBlock(offset, block) + block
}


exports.writable = function (state) {
  if(state.writing > state.written) throw new Error ('already writing')
  //from written to the end of the block, or the offset
  var max = Math.min(nextBlock(state.written,state.block), state.offset)
  state.writing = max
  return state
}

exports.getWritable = function (state) {
  return state.buffers[0].slice(state.written-state.start, state.writing - state.start)
}

exports.written = function (state) {
  if(state.writing <= state.written) throw new Error('not currently writing')
  state.written = state.writing
  if(!(state.written % state.block)) {
    state.start += state.block
    state.buffers.shift()
  }
  return state
}

exports.hasWholeWrite = function (state) {
  //if from written to offset finishes the block
  return nextBlock(state.written, state.block) < state.offset
}

exports.hasWrite = function (state) {
  return state.offset > state.written
}

exports.isWriting = function (state) {
  return state.writing > state.written
}
