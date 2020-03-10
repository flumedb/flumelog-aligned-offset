/*
  functional style modelling of append state.

  append(state, buffer) updates the state adding a new buffer.

  written, writable update state - called when state changes.

  hasWholeWrite, hasWrite, isWriting, getWritable just return properties of the state.

---


*/

exports.initialize = function (block, offset, buffer) {
  return {
    block: block,
    start: offset - offset%block,
    offset: offset || 0,
    written: offset || 0,
    writing: offset || 0,
    buffers: [buffer]
  }
}

exports.append = function (state, buffer) {
  var last = state.buffers[state.buffers.length-1]
  if(!last) throw new Error('no last buffer')

  //calculate where this write should start.
  var start = state.offset%state.block
  var _offset = state.offset

  //if this write won't fit, cap off the current buffer, and create a new one.
  if(start + buffer.length + 4 > state.block - 6) {
    //write length of block -1 to last slot as end marker.
    last.writeUInt16LE(state.block-1, start)
    //write pointer to just after last record at end of block.
    last.writeUInt32LE(start, state.block-4)
    //update offset to start of next block.
    state.offset = nextBlock(state.offset, state.block)
    start = 0
    //add another buffer to list
    state.buffers.push(last = Buffer.alloc(state.block))
  }
  //write framing and copy write data into this buffer.
  //(which maybe new if we went into the above if)
  last.writeUInt16LE(buffer.length, start)
  buffer.copy(last, start+2)
  last.writeUInt16LE(buffer.length, start+2+buffer.length)
  state.offset += 4+buffer.length

  if(state.offset <= _offset) throw new Error('offset must grow, was:'+_offset+', is now:'+state.offset)

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
  var max = Math.min(nextBlock(state.written, state.block), state.offset)
  if(max <= state.written) throw new Error('null write')
  state.writing = max
  return state
}

//return full buffers which may be written.
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

//if the write is a whole buffer.
exports.hasWholeWrite = function (state) {
  //if from written to offset finishes the block
  return nextBlock(state.written, state.block) < state.offset
}

//if there data that hasn't been written, even if it's not a whole block
exports.hasWrite = function (state) {
  return state.offset > state.written
}

//if currently writing.
exports.isWriting = function (state) {
  return state.writing > state.written
}
