var ltgt = require('ltgt')
var frame = require('./frame')
module.exports = Stream

function Stream (blocks, opts) {
  opts = opts || {}
  this.reverse = !!opts.reverse
  this.blocks = blocks
  this.cursor = this.start = this.end = -1
  var self = this
  this.opts = opts
  this.blocks.onReady(this._ready.bind(this))
}

Stream.prototype._ready = function () {
  if(this.reverse) {
    if(!ltgt.upperBoundInclusive(opts))
    this.cursor = this.start = ltgt.upperBound(this.opts, this.blocks.length)
    this.end = ltgt.lowerBound(this.opts, 0)
    /*
    return this.blocks.getPrevious(self.start, function (err, buffer, start, length) {
      self.cursor = start - 2
      self.resume() //start reading
    })
    else
      self.cursor = start
    */
  }
  else {
    this.cursor = this.start = ltgt.lowerBound(this.opts, 0)
    this.end = ltgt.upperBound(this.opts, this.blocks.length)
    var self = this
    this.blocks.getBlock(~~(self.start/self.blocks.block), function (err, buffer) {
      self._buffer = buffer
      self.resume()
    })
  }
}

Stream.prototype._next = function () {
  if(!this._buffer) return
  if(!this.reverse) {
    var result = frame.getRecord(this.blocks.block, this._buffer, this.cursor%this.blocks.block)
    if(!result) {
      //move to start of next block
      this.cursor = (this.cursor - this.cursor%this.blocks.block)+this.blocks.block
      if(this.cursor < this.blocks.length) {
        var self = this
        this.blocks.getBlock(~~(this.cursor/this.blocks.block), function (err, buffer) {
          self._buffer = buffer
          self.resume()
        })
      }
    }
    else {
      this.cursor += result.length + 4
      return result
    }
  }
  else
    throw new Error('not yet implemented')
}

Stream.prototype.resume = function () {
  if(this.ended) return
  while(this.sink && !this.sink.paused && !this.ended) {
    var result = this._next()
    if(result && result.length) this.sink.write(this._buffer.slice(result.start, result.start+result.length))
    else if(!this.live && (result ? result.length == 0 : this.cursor >= this.blocks.length)) {
      this.ended = true
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
}

Stream.prototype.pipe = require('push-stream/pipe')

