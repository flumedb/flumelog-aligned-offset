var pull = require('pull-stream')
var FlumeLog = require('flumelog-offset')
var fs = require('fs')
var frame = require('../frame')
var binary = require('binary')
var json = require('flumecodec/json')
var block = 64*1024
function id (e) { return e }

var log = FlumeLog(process.argv[2], {blockSize: block, codec: json})

var types = {}
pull(
  log.stream({seqs:false, codec: json}),
  pull.drain(function (data) {
    var type = data.value.content.type
    types[type] = (types[type] || 0) + 1
  }, function () {
    console.log(types)
  })
)
//*/












