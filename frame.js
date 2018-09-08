module.exports = function frame (array, block, b) {
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
      if(c+length+2 > 65530)
        console.log(c+length+2)
      offsets.push(c)
      c+=length+4
    }
  }
  return offsets
}






