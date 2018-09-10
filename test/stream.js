
var tape = require('tape')
var fs = require('fs')
var FlumeLogRaf = require('../')

tape('empty', function (t) {
  var log = FlumeLogRaf('/tmp/test-flumelog-raf', {block: 64*1024})
  log.stream().pipe({
    paused: false,
    write: function () { throw new Error('should be empty') },
    end: t.end
  })
})

