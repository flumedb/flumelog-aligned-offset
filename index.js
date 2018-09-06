
var RAF = require('random-access-file')

module.exports = function (file, opts) {
  var raf = RAF(file)
  var block = opts && opts.block || 65536
  var length = null, waiting = []
  raf.stat(function (err, stat) {
    length = stat.size || 0
    if(waiting.length)
      while(waiting.length) waiting.shift()()
  })

  function onLoad (fn) {
    return function (offset, cb) {
      if(length === null) waiting.push(function () { fn(offset, cb) })
      else fn(offset, cb)
    }
  }

  function getBlock (i,  cb) {
    var file_start = i*block
    //insert cache here...
    raf.read(file_start, Math.min(block, length-file_start), cb)
  }

  function get (offset, cb) {
    //read the whole block
    var block_start = offset%block
    var file_start = offset - block_start
    getBlock(~~(offset/block), function (err, buffer) {
      if(err) return cb(err)
      var length = buffer.readUInt16LE(block_start)

      //if this is last item in block, jump to start of next block.
      if(length === block-1)
        get(file_start+block, cb)
      else
        cb(null, buffer, block_start+2, length)
    })
  }

  return {

    get: onLoad(get),

    getPrevious: onLoad(function (offset, cb) {
      var block_start = offset%block
      var file_start = offset - block_start
      if(block_start === 0) {
        file_start = file_start - block //read the previous block!
        raf.read(file_start, Math.min(block, length-file_start), function (err, buffer) {
          block_start = buffer.readUInt32LE(block-4)
          var length = buffer.readUInt16LE(block_start-2)
          cb(null, buffer, block_start-4-length, length)
        })
      }
      else
        raf.read(file_start, Math.min(block, length-file_start), function (err, buffer) {
          var length = buffer.readUInt16LE(block_start-2)
          cb(null, buffer, block_start-4-length, length)
        })
    }),

    getNext: onLoad(function (offset, cb) {
      var block_start = offset%block
      var file_start = offset - block_start
      getBlock(~~(offset/block), function (err, buffer) {
        if(err) return cb(err)

        var length = buffer.readUInt16LE(block_start)
        if(length == block-1)
          get(file_start + block, cb)
        else
          get(offset+length+4, cb)
      })

    }),

    append: function append (data, cb) {
      if(length == null)
        waiting.push(function () { append(data, cb) })
      else {

      }
    }
  }
}

