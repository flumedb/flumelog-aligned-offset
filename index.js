var RAF = require('random-access-file')
var Cache = require('lru_cache').LRUCache
var Stream = require('./stream')

module.exports = function (file, opts) {
  var cache = new Cache(1024)
  var raf = RAF(file)
  var block = opts && opts.block || 65536
  var length = null, waiting = [], self

  raf.stat(function (err, stat) {
    self.length = length = stat ? stat.size : 0
    while(waiting.length) waiting.shift()()
  })

  function onLoad (fn) {
    return function (offset, cb) {
      if(length === null) waiting.push(function () { fn(offset, cb) })
      else fn(offset, cb)
    }
  }

  // the cache slows things down a surprising amount!
  // an entire scan in 1.76 seconds, vs > 2.5 seconds.
  var DO_CACHE = false
  var last_index = -1, last_buffer
  var blocks = cache; //new WeakMap()

  function getBlock (i,  cb) {
    if(i === last_index) return cb(null, last_buffer)
    if(DO_CACHE && blocks.get(i)) return cb(null, blocks.get(i))
    var file_start = i*block
    //insert cache here...
    raf.read(file_start, Math.min(block, length-file_start), function (err, buffer) {
      if(DO_CACHE) blocks.set(i, buffer)
      last_index = i; last_buffer = buffer;
      cb(err, buffer)
    })
  }

  function get (offset, cb) {
    //read the whole block
    if(offset >= length) return cb()
    var block_start = offset%block
    var file_start = offset - block_start
    getBlock(~~(offset/block), function (err, buffer) {
      if(err) return cb(err)
      var length = buffer.readUInt16LE(block_start)
      //if this is last item in block, jump to start of next block.
      if(length === block-1)
        get(file_start+block, cb)
      else
        cb(null, buffer, block_start+2, length, offset)
    })
  }

  return self = {
    block: block,
    length: null,
    getBlock: onLoad(getBlock),
    get: onLoad(get),

    getPrevious: onLoad(function (offset, cb) {
      var block_start = offset%block
      var file_start = offset - block_start
      if(block_start === 0) {
        file_start = file_start - block //read the previous block!
        getBlock(~~(offset/block)-1, function (err, buffer) {
          block_start = buffer.readUInt32LE(block-4)
          var length = buffer.readUInt16LE(block_start-2)
          cb(null, buffer, block_start-2-length, length)
        })
      }
      else {
        getBlock(~~(offset/block), function (err, buffer) {
          var length = buffer.readUInt16LE(block_start-2)
          cb(null, buffer, block_start-2-length, length)
        })
      }
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

    onReady: function (fn) {
      if(this.length) return fn()
      waiting.push(fn)
    },

    append: function append (data, cb) {
      if(length == null)
        waiting.push(function () { append(data, cb) })
      else {
        throw new Error('not yet implemented')
      }
    },

    stream: function (opts) {
      return new Stream(this, opts)
    }
  }
}

