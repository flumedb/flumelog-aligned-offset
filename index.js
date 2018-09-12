var RAF = require('random-access-file')
var Cache = require('lru_cache').LRUCache
var Stream = require('./stream')
var Append = require('./append')

module.exports = function (file, opts) {
  var cache = new Cache(1024)
  var raf = RAF(file)
  var block = opts && opts.block || 65536
  var length = null, waiting = [], waitingDrain = [], self, state

  raf.stat(function (err, stat) {
    var len = stat ? stat.size : 0
    if(len%block == 0) {
      self.length = length = len
      self.appendState = state = Append.initialize(block, length, Buffer.alloc(block))
      while(waiting.length) waiting.shift()()
    } else {
      raf.read(len - len%block, Math.min(block, len), function (err, _buffer) {
        var buffer = Buffer.alloc(block)
        _buffer.copy(buffer)
        self.length = length = len
        self.appendState = state = Append.initialize(block, length, buffer)
        while(waiting.length) waiting.shift()()
      })
    }
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
    console.log("GET?", file_start, state.start)
    if(file_start == state.start)
      return cb(null, state.buffers[0])

    console.log("GET", file_start, Math.min(block, length-file_start))
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

  var write_timer
  function next_write () {
    state = Append.writable(state)
    var buffer = Append.getWritable(state)
    console.log('Write', buffer, state)
    raf.write(state.written, buffer, function (err) {
      state = Append.written(state)
      schedule_next_write()
    })
  }

  function schedule_next_write () {
    if(Append.hasWholeWrite(state))
      next()
    else if(Append.hasWrite(state)) {
      clearTimeout(write_timer)
      write_timer = setTimeout(next_write, 20)
    } else
      while(waitingDrain.length)
        waitingDrain.shift()()
  }

  function append(data, cb) {
    state = Append.append(state, data)
    schedule_next_write()
    cb()
  }

  return self = {
    block: block,
    length: null,
    appendState: state,
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
      if(this.length != null) return fn()
      waiting.push(fn)
    },

    append: onLoad(append),

    stream: function (opts) {
      return new Stream(this, opts)
    },

    onDrain: function (fn) {
      if(!Append.hasWrite(state)) fn()
      else waitingDrain.push(fn)
    }
  }
}







