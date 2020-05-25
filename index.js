var Cache = require('lru_cache').LRUCache
var RAF = require('polyraf')
var Stream = require('./stream')
var Append = require('./append')
var frame = require('./frame')
var DO_CACHE = true

function id(e) { return e }
var _codec = {encode: id, decode: id, buffer: true}

module.exports = function (file, opts) {
  var cache = new Cache(1024)
  var raf = RAF(file)
  var closed = false
  var block = opts && opts.block || opts.blockSize || 65536
  var length = null, waiting = [], waitingDrain = [], self, state
  var codec = opts && opts.codec || _codec
  var since = {value: undefined}

  function onError(err) {
    if(self.onError) self.onError(err)
    else throw err
  }

  raf.stat(function (_, stat) {
    var len = stat ? stat.size : -1
    self.length = length = len == -1 ? 0 : len
    if(len == -1 || length%block == 0) {
      self.appendState = state = Append.initialize(block, length, Buffer.alloc(block))
      if (len > 0 && length%block == 0) {
        raf.read(len - block, block, function (err, _buffer) {
          var offset = frame.getLastRecord(block, _buffer, block)
          while(waiting.length) waiting.shift()()
          self.onWrite(len - block + offset)
        })
      } else {
        while(waiting.length) waiting.shift()()
        self.onWrite(len)
      }
    } else {
      raf.read(len - len%block, Math.min(block, len%block), function (err, _buffer) {
        if(err) return onError(err)
        //raf always gives us the last block the actual size
        //so copy it to a full size block.
        var buffer = Buffer.alloc(block)
        _buffer.copy(buffer)
        self.appendState = state = Append.initialize(block, length, buffer)
        var offset = frame.getPreviousRecord(block, buffer, length)
        self.onWrite(offset)
        while(waiting.length) waiting.shift()()
      })
    }
  })

  function onLoad (fn) {
    return function (arg, cb) {
      if(closed) return cb(new Error('closed'))
      if(length === null) waiting.push(function () { fn(arg, cb) })
      else return fn(arg, cb)
    }
  }

  // the cache slows things down a surprising amount!
  // an entire scan in 1.76 seconds, vs > 2.5 seconds.
  var last_index = -1, last_buffer
  var blocks = cache; //new WeakMap()

  function readFromRAF(file_start, i, cb)
  {
    raf.read(file_start, Math.min(block, length-file_start), function (err, buffer) {
      if(err) return cb(err)
      if(DO_CACHE) blocks.set(i, buffer)
      last_index = i; last_buffer = buffer;
      cb(null, buffer)
    })
  }

  function getBlock (i,  cb) {
    if(i === last_index)
      return cb(null, last_buffer)
    if(DO_CACHE && blocks.get(i))
      return cb(null, blocks.get(i))

    var file_start = i*block
    //insert cache here...

    if(file_start == state.start)
      return cb(null, state.buffers[0])
    else if (file_start >= state.writing && Append.isWriting(state))
      waitingDrain.push(() => {
        readFromRAF(file_start, i, cb)
      })
    else
      readFromRAF(file_start, i, cb)
  }

  function callback(cb, buffer, start, length, offset) {
    //I did consider just returning the whole buffer + start + length,
    //then let the reader treat that as pointers, but it didn't
    //actually measure to be faster.

    var data = buffer.slice(start, start+length)

    if (data.every(x => x === 0)) {
      const err = new Error('item has been deleted')
      err.code = 'flumelog:deleted'
      return cb(err)
    }
    else
      cb(null, codec.decode(data), start, length, offset)
  }

  function getPrevious (offset, cb) {
    var block_start = offset%block
    var file_start = offset - block_start
    if(block_start === 0) {
      file_start = file_start - block //read the previous block!
      getBlock(~~(offset/block)-1, function (err, buffer) {
        block_start = buffer.readUInt32LE(block-4)
        var length = buffer.readUInt16LE(block_start-2)
        callback(cb, buffer, block_start-2-length, length, offset)
      })
    }
    else {
      getBlock(~~(offset/block), function (err, buffer) {
        var length = buffer.readUInt16LE(block_start-2)
        callback(cb, buffer, block_start-2-length, length, offset)
      })
    }
  }

  function getRecord(offset, cb) {
    //read the whole block
    if(offset >= length) return cb()
    var record_start = offset%block
    var block_start = offset - record_start
    getBlock(~~(offset/block), function (err, buffer) {
      if(err) return cb(err)
      var length = buffer.readUInt16LE(record_start)
      //if this is last item in block, jump to start of next block.
      if(length === block-1) //wouldn't zero be better?
        getRecord(block_start+block, cb)
      else
        cb(null, buffer, block_start, record_start, length)
    })
  }

  function get (offset, cb) {
    getRecord(offset, function (err, buffer, block_start, record_start, length) {
      if (err) return cb(err)
      callback(cb, buffer, record_start+2, length, offset)
    })
  }

  //TODO move this write handling stuff into another file
  var write_timer
  var w = 0
  function next_write () {
    if (!self.canWrite) return
    state = Append.writable(state)
    var buffer = Append.getWritable(state)
    raf.write(state.written, buffer, function (err, v) {
      if(err) throw err
      state = Append.written(state)

      //TODO: some views could be eager, updating before the log is fully persisted
      //      just don't write the view data until the log is confirmed.

      //i moved waitingDrain here, but realized that emitting the streams needed to be before that.
      //XXX this is wrong. calls resume on streams that might still be reading older blocks.
      //this should only call resume on streams that are waiting for the newest block.
      if(self.streams.length) {
        for(var i = 0; i < self.streams.length; i++) {
          var stream = self.streams[i]
          if(!stream.ended && stream._at_end)
            stream.resume()
        }
      }

      //waitingDrain moved from schedule_next_write
      for (var i = 0, length = waitingDrain.length; i < length; ++i)
        waitingDrain[i]()

      waitingDrain = waitingDrain.slice(length)

      return schedule_next_write()
    })
  }

  function schedule_next_write () {
    if(Append.isWriting(state)) return
    if(Append.hasWholeWrite(state)) {
      clearTimeout(write_timer)
      next_write()
    } else if(Append.hasWrite(state)) {
      clearTimeout(write_timer)
      write_timer = setTimeout(next_write, 20)
    } else {
      //waiting was draining when it was ready to queue more
      //appends, but thought it would be better if it was
      //happened after it definitely is written.
      //maybe there should be a way to wait for both?
      //        while(waitingDrain.length)
      //          waitingDrain.shift()()
    }
  }

  function _append(data) {
    data = codec.encode(data)
    if('string' == typeof data)
      data = Buffer.from(data)
    //we want to track the pointer to the latest block added,
    //so set value before state is updated.
    since.value = state.offset
    state = Append.append(state, data)
  }

  function append(data, sync, cb) {
    if('function' === typeof sync)
      cb = sync, sync = true

    if(Array.isArray(data)) {
      for(var i = 0; i < data.length; i++)
        _append(data[i])
    } else
      _append(data)

    self.length = length = state.offset
    var offset = since.value
    schedule_next_write()
    self.onWrite(offset)
    if(sync)
      self.onDrain(function () {
        cb(null, since.value)
      })
    else
      cb(null, offset)
  }

  function nullMessage(offset, cb) {
    getRecord(offset, function (err, buffer, block_start, record_start, length) {
      if (err) return cb(err)

      const nullBytes = Buffer.alloc(length)
      nullBytes.copy(buffer, record_start+2)
      raf.write(block_start, buffer, cb)
    })
  }

  return self = {
    filename: file,
    block: block,
    length: null,
    appendState: state,
    codec: codec,
    getBlock: onLoad(getBlock),
    get: onLoad(get),
    since: since,
    getPrevious: onLoad(getPrevious),

    del: function(offset, cb)
    {
      if (DO_CACHE) cache.remove(offset)
      nullMessage(offset, cb)
    },

    onReady: function (fn) {
      if(this.length != null) return fn()
      waiting.push(fn)
    },

    append: onLoad(append),

    stream: function (opts) {
      var stream = new Stream(this, opts)
      this.streams.push(stream)
      return stream
    },

    streams: [],

    onWrite: function () {},

    // for tests
    canWrite: true,

    onDrain: onLoad(function (fn) {
      if(!Append.hasWrite(state)) fn()
      else waitingDrain.push(fn)
    }),

    close: function (cb) {
      self.onReady(function () {
        self.onDrain(function () {
          while(self.streams.length)
            self.streams.shift().abort(new Error('flumelog-aligned-offset: closed'))
          closed = true
          raf.close(function () {
            cb()
          })
        })
      })
    }
  }
}
