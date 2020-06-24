// scan through a bipf log, looking for particular values.
// it's a brute force search! but it's really fast because
// no parsing. not really much different than just dumping the file!!!

var FlumeLogRaf = require('../')
var Looper = require('looper')
var raf = FlumeLogRaf(process.argv[2], {block: 64*1024})
var binary = require('bipf')
var path = require('path')

var _type = new Buffer('type')
var _channel = new Buffer('channel')
var _content = new Buffer('content')
var _value = new Buffer('value')
var _post = new Buffer('post')
var _text = new Buffer('text')
var _channelValue = new Buffer('solarpunk')

var start = Date.now()
var count = 0
var found = 0

raf.stream({}).pipe({
  paused: false,
  write: function (data) {
    var seq = data.seq
    var buffer = data.value
    count++

    var p = 0 // note you pass in p!
    p = binary.seekKey(buffer, p, _value)
    if(~p) {
      p = binary.seekKey(buffer, p, _content)
      if(~p) {
        p = binary.seekKey(buffer, p, _channel)
        if(~p) {
          if(binary.compareString(buffer, p, _channelValue) === 0)
            found++
        }
      }
    }
  },
  end: () => {
    console.log(`time: ${Date.now()-start}ms, total items: ${count}, found: ${found}`)
  }
})









