var ltgt = require('ltgt')
var frame = require('./frame')
module.exports = Stream

function Stream (blocks, opts) {
  opts = opts || {}
  this.reverse = !!opts.reverse
  this.live = !!opts.live
  this.blocks = blocks
  this.cursor = -1 //this.start = this.end = -1
  this.seqs = opts.seqs !== false
  this.values = opts.values !== false
  this.limit = opts.limit || 0
  this.count = 0

  this.min = this.max = this.min_inclusive = this.max_inclusive = null

  var self = this
  this.opts = opts
  this.blocks.onReady(this._ready.bind(this))
}

Stream.prototype._ready = function () {
  this.min = ltgt.lowerBound(this.opts, null)
  if(ltgt.lowerBoundInclusive(this.opts))
    this.min_inclusive = this.min

  this.max = ltgt.upperBound(this.opts, null)
  if(ltgt.upperBoundInclusive(this.opts))
    this.max_inclusive = this.max

  //note: cursor has default of the current length or zero.
  if(this.reverse)
    this.cursor = ltgt.upperBound(this.opts, this.blocks.length)
  else
    this.cursor = ltgt.lowerBound(this.opts, 0)

  if(this.cursor < 0) this.cursor = 0

  var self = this
  this.blocks.getBlock(~~(this.cursor/self.blocks.block), function (err, buffer) {
    self._buffer = buffer
    //reversing cursor starts at length, which won't be a thing.
    self.resume()
  })
}

Stream.prototype._next = function () {
  if(!this._buffer || this.cursor === -1 || this.isAtEnd()) return
  var block = this.blocks.block
  var next_block
  if(!this.reverse) {
    var result = frame.getRecord(block, this._buffer, this.cursor)
    if(result) {
      this.cursor += result.length + 4
      return result
    } else {
      //move to start of next block
      this.cursor = (this.cursor - this.cursor%block)+block
      if(this.cursor < this.blocks.length) {
        //sometimes this is sync, which means we can actually return instead of cb
        //if we always cb, we can get two resume loops going, which is weird.
        next_block = ~~(this.cursor/block)
      }
      else
        return
    }
  }
  else {
    if(this.cursor % block) {
      //get the previous record, unless this is the first item
      //in a lte stream.
      if(!(this.count === 0 && this.max_inclusive === this.cursor)) {
        this.cursor = frame.getPreviousRecord(block, this._buffer, this.cursor)
      }
      var result = frame.getRecord(block, this._buffer, this.cursor)
      return result
    }
    else {
      var current_block = ~~(this.cursor/block)
      next_block = ~~(this.cursor/block)-1
      if(current_block === next_block)
        throw new Error('failed to decrement block')
    }
  }
  var self = this, async = false, returned = false
  if(next_block >= 0)
    this.blocks.getBlock(next_block, function (err, buffer) {
      //if(err) return self.abort(err)
      self._buffer = buffer
      returned = true
      if(self.reverse) {
        //point to the end of the blocks, in the newly retrived block
        self.cursor = next_block*block + buffer.readUInt32LE(block - 4)
      }
      if(async) self.resume()
    })
  async = true
  if(returned) return self._next()
}

Stream.prototype.isAtEnd = function () {
  return this.reverse ? this.cursor <= 0 : this.cursor >= this.blocks.length
}


Stream.prototype._format = function (result) {
  if(this.values) {
    var value = this.blocks.codec.decode(this._buffer.slice(result.start, result.start + result.length))
    if(this.seqs) this.sink.write({seq: result.offset, value: value})
    else this.sink.write(value)
  }
  else
    this.sink.write(result.offset)
}

Stream.prototype.resume = function () {
  if(this.ended) return
  while(this.sink && !this.sink.paused && !this.ended) {
    var result = this._next()
    if(result && result.length) {
      var o = result.offset
      this.count++
      if(
        (this.min === null || this.min < o || this.min_inclusive === o) &&
        (this.max === null || this.max > o || this.max_inclusive === o)
      ) {
        this._format(result)
      }
      else {
        if(this.limit > 0 && this.count >= this.limit) {
          this.abort(); this.sink.end()
        }
      }
    }
    else if(!this.live && (result ? result.length == 0 : this.isAtEnd())) {
      if(this.ended) throw new Error('already ended')
      this.abort()
      return
    }
    else
      return

  }
}

Stream.prototype.abort = function (err) {
  //only thing to do is unsubscribe from live stream.
  //but append isn't implemented yet...
  this.ended = err || true
  this.blocks.streams.splice(this.blocks.streams.indexOf(this), 1)
  if(!this.sink.ended)
    this.sink.end(err === true ? null : err)
}

Stream.prototype.pipe = require('push-stream/pipe')






