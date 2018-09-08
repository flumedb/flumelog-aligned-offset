var ltgt = require('ltgt')
var parse = require('./blocks')
module.exports = Stream

function Stream (blocks, opts) {
  this.reverse = !!opts.reverse
  this.blocks = blocks
  var self = this
  this.blocks.onReady(function () {
    if(self.reverse) {
      self.start = ltgt.upperBound(opts, self.blocks.length)
      self.end = ltgt.lowerBound(opts, 0)
      if(!ltgt.upperBoundInclusive(opts))
        return this.blocks.getPrevious(self.start, function (err, buffer, start, length) {
          self.cursor = start - 2
          self.resume() //start reading
        })
      else
        self.cursor = start
    }
    else {
      self.start = ltgt.lowerBound(opts, 0)
      self.end = ltgt.upperBound(opts, self.blocks.length)
      if(!ltgt.lowerBoundInclusive(opts)) {
        this.blocks.get(self.start, function (err, buffer, start, length) {
          
        })
      }
    }
  })
}

Stream.prototype._next = function () {
  if(!this.reverse) {
    var result = this._block.getRecord(this._buffer, this.cursor)
    if(!result) {
      //move to start of next block
      this.cursor = ~~(offset/block)+block
      if(this.cursor < this._blocks.length) {
        var self = this
        this.blocks.getBlock(~~(offset/block), function (err, buffer) {
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
  while(this.dest && !this.dest.paused) {
    var result = this._next()
    if(result) this.dest.write(this._buffer.slice(result.start, result.start+result.length)
    else if(!this.live && this.cursor >= this.blocks.length) {
      this.ended = true
      this.dest.end()
    }
  }
}

Stream.prototype.abort = function () {
  //only thing to do is unsubscribe from live stream.
  //but append isn't implemented yet...
}

Stream.prototype.pipe = require('push-stream/pipe')
