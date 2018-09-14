var result = {start: -1, length: -1}
module.exports = {
  encode: function (block, array, b) {
    var c = 0
    var offsets = []
    for(var i = 0; i<array.length; i++) {
      var length = array[i].length
      //the buffer is full, pad end.
      if(c+length+4 >= block-6) {
        b.fill(0, c+2, block)
        b.writeUInt32LE(c, block-4) //write pointer to last item
        b.writeUInt16LE(block-1, c)
        if(c >= block-6) throw new Error('block overlaps:'+c+', '+(block-6))
        return offsets
      }
      else {
        b.writeUInt16LE(length, c)
        array[i].copy(b, c+2, 0, length)
        b.writeUInt16LE(length, c+length+2)
        offsets.push(c)
        c+=length+4
      }
    }
    return offsets
  },


  getBlockIndex: function (block, offset) {
    return ~~(offset/block)
  },
  getBlockStart: function (block, offset) {
    return offset % block
  },

  //getRecord(buffer, 0) for first record in block
  getRecord: function (block, buffer, start) {
    var length = buffer.readUInt16LE(start)
    if(length === block - 1)
      return null
    else {
      var _length = buffer.readUInt16LE(start+2+length)
      if(_length != length)
        throw new Error('expected matching length at end, expected:'+length+', was:'+_length)
      result.start = start+2
      result.length = length
      return result
    }
  },

  getLastRecord: function (block, buffer) {
    var start = buffer.readUInt32LE(block - 4)
    return exports.getPreviousRecord(block, buffer, start)
  },

  getPreviousRecord: function (block, buffer, start) {
    if(start == 0) return
    var length = buffer.readUInt16LE(start-2)
    result.start = start - 2 - length
    result.length = length
    return result
  }
}



