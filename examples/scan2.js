var FlumeLogRaf = require('../')
var Looper = require('looper')
var raf = FlumeLogRaf(process.argv[2], {block: 64*1024})
var binary = require('bipf')
var path = require('path')
//scan through a bipf log, looking for particular values.
//it's a brute force search! but it's really fast because
//no parsing. not really much different than just dumping the file!!!

var pbox = require('../../private-box')

var _type = new Buffer('type')
var _timestamp = new Buffer('timestamp')
var _channel = new Buffer('channel')
var _content = new Buffer('content')
var _value = new Buffer('value')
var _post = new Buffer('post')
var _text = new Buffer('text')
var _channelValue = new Buffer('solarpunk')

var offset = 0
var count = 0, min = Number.infinity, max = 0
var p = 0
var ts = Date.now()
var found = 0

//var _root = new Buffer('root')
//var _rootValue = new Buffer('%Gs2NhjWxbNQrsOu1AtL4w8x7BudcvbE5CY8Uc+14DA4=.sha256')

function end () {
  console.log('end', Date.now()-start, count, found)
}
var pos = 0, neg = 0, c_pos = 0, c_neg = 0
var types = {}
var start = Date.now()
var b = Buffer.alloc(8)
raf.stream({}).pipe({
  paused: false,
  write: function (data) {
      var seq = data.seq
      var buffer = data.value
      count ++
      var start = p = 0
      p = binary.seekKey(buffer, p, _timestamp)
      var v = buffer.readDoubleLE(p+1)
      min = Math.min(min, v)
      max = Math.max(max, v)
      if(!(count % (16*1024))) {
        console.log(count, min, max, new Date(min), new Date(max))
        min = max = v
      }


//      b.writeDoubleLE()
//      process.stdout.write(b)
//      var S = process.hrtime()
/*
      p = binary.seekKey(buffer, p, _value)
      if(~p) {
        p = binary.seekKey(buffer, p, _content)
        if(~p) {
          p = binary.seekKey(buffer, p, _channel)
          if(~p) {
            if(binary.compareString(buffer, p, _channelValue) === 0)
              console.log(seq)
          }
        }
      }
*/
  },
  end: function () {
    console.log(found, count)
    console.log(pos/c_pos, neg/c_neg, (neg/c_neg) / ((pos/c_pos) + (neg/c_neg)))
  }
})

