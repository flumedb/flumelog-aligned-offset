var FlumeLogRaf = require('../')
var Looper = require('looper')
var raf = FlumeLogRaf(process.argv[2], {block: 64*1024})
var binary = require('binary')
var BinaryProxy = require('binary/proxy')
var _type = new Buffer('type')
var _content = new Buffer('content')
var _value = new Buffer('value')

var offset = 0
var count = 0
var p = 0
var ts = Date.now()
var next = Looper(function () {
  raf.get(offset, function (err, buffer, start, length, _offset) {
    if(!buffer || length == 0) return console.log(count)
    count++
    if(ts + 1000 < Date.now()) {
      console.log(count)
      ts = Date.now()
    }
    var data = JSON.parse(buffer.toString('utf8', start, start+length))
    data.value.content.type
    offset = _offset+4+length; next()
  })
})
next()



















