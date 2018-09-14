var ltgt = require('ltgt')
var frame = require('./frame')
module.exports = Stream

function Stream (blocks, opts) {
  opts = opts || {}
  this.reverse = !!opts.reverse
  this.live = !!opts.live
  this.blocks = blocks
  this.cursor = this.start = this.end = -1
  this.seqs = opts.seqs !== false
  this.values = opts.values !== false

  var self = this
  this.opts = opts
  this.blocks.onReady(this._ready.bind(this))
}

Stream.prototype._ready = function () {
  if(this.reverse) {
    this.cursor = this.start = ltgt.upperBound(this.opts, this.blocks.length)
    this.end = ltgt.lowerBound(this.opts, 0)
  }
  else {
    this.cursor = this.start = ltgt.lowerBound(this.opts, 0)
    this.end = ltgt.upperBound(this.opts, this.blocks.length)
  }
  var self = this
  this.blocks.getBlock(~~(self.start/self.blocks.block), function (err, buffer) {
    self._buffer = buffer
    self.resume()
  })
}

Stream.prototype._next = function () {
  if(!this._buffer || this.start === -1 || this.isAtEnd()) return
  var next_block
  if(!this.reverse) {
    var result = frame.getRecord(this.blocks.block, this._buffer, this.cursor%this.blocks.block)
    if(result) {
      this.cursor += result.length + 4
      return result
    } else {
      //move to start of next block
      this.cursor = (this.cursor - this.cursor%this.blocks.block)+this.blocks.block
      if(this.cursor < this.blocks.length) {
        //sometimes this is sync, which means we can actually return instead of cb
        //if we always cb, we can get two resume loops going, which is weird.
        next_block = ~~(this.cursor/this.blocks.block)
      }
      else
        return
    }
  }
  else {
    if(this.cursor == 0) {
      this.cursor --
      return
    }
    else if(this.cursor % this.blocks.block) {
      var result = frame.getPreviousRecord(this.blocks.block, this._buffer, this.cursor%this.blocks.block)
      this.cursor -= (result.length+4)
      return result
    }
    else {
      next_block = ~~(this.cursor/this.blocks.block)-1
    }
  }
  var self = this, async = false, returned = false
  this.blocks.getBlock(next_block, function (err, buffer) {
    self._buffer = buffer
    returned = true
    if(self.reverse)
        self.cursor = self.blocks.block*next_block + buffer.readUInt32LE(self.blocks.block-4)
    if(async) self.resume()
  })
  async = true
  if(returned) return self._next()
}

Stream.prototype.isAtEnd = function () {
  return this.reverse ? this.cursor < 0 : this.cursor >= this.blocks.length
}


Stream.prototype._format = function (result) {
  if(this.values) {
    var value = this._buffer.slice(result.start, result.start + result.length)
    if(this.seqs) this.sink.write({seqs: this.cursor, value: value})
    else this.sink.write(value)
  }
  else
    this.sink.write(this.cursor)
}

Stream.prototype.resume = function () {
  if(this.ended) return
  while(this.sink && !this.sink.paused && !this.ended) {
    var result = this._next()
    if(result && result.length)
      this._format(result)
    else if(!this.live && (result ? result.length == 0 : this.isAtEnd())) {
      if(this.ended) throw new Error('already ended')
      this.abort()
      this.sink.end()
      return
    }
    else
      return

  }
}

Stream.prototype.abort = function () {
  //only thing to do is unsubscribe from live stream.
  //but append isn't implemented yet...
  this.ended = true
  this.blocks.streams.splice(this.blocks.streams.indexOf(this), 1)
}

Stream.prototype.pipe = require('push-stream/pipe')

