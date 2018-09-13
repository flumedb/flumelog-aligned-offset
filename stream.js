var ltgt = require('ltgt')
var frame = require('./frame')
module.exports = Stream

function Stream (blocks, opts) {
  opts = opts || {}
  this.reverse = !!opts.reverse
  this.live = !!opts.live
  this.blocks = blocks
  this.cursor = this.start = this.end = -1
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
    console.log(buffer)
    self.resume()
  })
}

Stream.prototype._next = function () {
  if(!this._buffer || this.start === -1 || this.isAtEnd()) return
  if(!this.reverse) {
    var result = frame.getRecord(this.blocks.block, this._buffer, this.cursor%this.blocks.block)
    if(result) {
      this.cursor += result.length + 4
      return result
    } else {
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
  }
  else {
    if(this.cursor == 0) {
      this.cursor --
    }
    else if(this.cursor % this.blocks.block) {
      var result = frame.getPreviousRecord(this.blocks.block, this._buffer, this.cursor%this.blocks.block)
      this.cursor -= (result.length+4)
      return result
    }
    else {
      var self = this
      this.blocks.getBlock(~~(this.cursor/this.blocks.block)-1, function (err, buffer) {
        self._buffer = buffer
        //point at padding in block
        self.cursor = buffer.readUInt32LE(this.blocks.block-4)
        self.resume()
      })
    }
  }
}

Stream.prototype.isAtEnd = function () {
  return this.reverse ? this.cursor < 0 : this.cursor >= this.blocks.length
}

Stream.prototype.resume = function () {
  if(this.ended) return
  while(this.sink && !this.sink.paused && !this.ended) {
    var result = this._next()
    if(result && result.length) this.sink.write(this._buffer.slice(result.start, result.start+result.length))
    else if(!this.live && (result ? result.length == 0 : this.isAtEnd())) {
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

  this.blocks.streams.splice(this.blocks.streams.indexOf(this), 1)
}

Stream.prototype.pipe = require('push-stream/pipe')






