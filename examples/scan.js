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
var _channel = new Buffer('channel')
var _content = new Buffer('content')
var _value = new Buffer('value')
var _post = new Buffer('post')
var _text = new Buffer('text')
var _channelValue = new Buffer('solarpunk')

var offset = 0
var count = 0
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
raf.stream({seqs: false}).pipe({
  paused: false,
  write: function (buffer) {
      count ++
      var start = p = 0
      var S = process.hrtime()
      p = binary.seekKey(buffer, p, _value)
      if(~p) {
        p = binary.seekKey(buffer, p, _content)
//        console.log(binary.getEncodedType(buffer, p), binary.types.buffer)
        if(binary.types.buffer === binary.getEncodedType(buffer, p)) {
        }
//        p = binary.seekKey(buffer, p, _text)
//        if(~p) {
//          c_pos ++; pos += process.hrtime(S)[1] / 1000
//        } else {
//          c_neg ++; neg += process.hrtime(S)[1] / 1000
//        }
      }
  },
  end: function () {
    console.log(found, count)
    console.log(pos/c_pos, neg/c_neg, (neg/c_neg) / ((pos/c_pos) + (neg/c_neg)))
  }
})
return
var next = Looper(function () {
  raf.get(offset, function (err, buffer, start, length, _offset) {
    var type
    if(!buffer || length == 0) return end()
    count++
    if(ts + 1000 < Date.now()) {
      console.log(count, found)
      ts = Date.now()
    }

    if(true) {
//      buffer = buffer.slice(start, start+length)
      p = start
      p = binary.seekKey(buffer, p, _value)
      p = binary.seekKey(buffer, p, _content)
      var p_type = binary.seekKey(buffer, p, _type)
//      console.log(p, p_type)
      if(~p_type &&  binary.compareString(buffer, p_type, _post) === 0) {
//type = binary.decode(buffer, p_type)) == 'post') {
        var p_root = binary.seekKey(buffer, p, _root)
        if(~p_root && binary.compareString(buffer, p_root, _rootValue) === 0) {
            found ++
          console.log(binary.decode(buffer, start))
          if(found > 100) return end()
        }
      }
    }
    else if(false) {
      var data = BinaryProxy(buffer, start)
      var type = data.value.content.type
    } else {
      type = binary.decode(buffer, start).value.content.type
    }
    types[type] = (types[type] || 0) + 1
    offset = _offset+4+length; next()
  })
})
next()

