module.exports = function (block) {

  var result = {start: -1, length: -1}
  return {
    //getRecord(buffer, 0) for first record in block
    getRecord: function (buffer, start) {
      var length = buffer.readUInt16LE(start)
      if(length === block - 1)
        return -1
      else {
        if(buffer.readUInt16LE(start+2+length) != length)
          throw new Error('expected matching length at end, expected:'+length+', was:'+buffer.readUInt16LE(start+2+length))
        result.start = start+2
        result.length = length
        return result
      }
    },

    getLastRecord: function (buffer) {
      var start = buffer.readUInt32LE(block - 4)
      return exports.getPreviousRecord(block, buffer, start)
    },

    getPreviousRecord: function (buffer, start) {
      var length = buffer.readUInt16LE(start-2)
      if(start == 0) return -1
      result.start = start - 2 - length
      result.length = length
      return result
    }
  }

}

