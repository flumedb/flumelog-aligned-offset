var create = require('../')
var testLog = require('test-flumelog')
var toCompat = require('../compat')

testLog(function (filename) {
  var raf = create(filename, {
    blockSize: 1024*64,
    codec: require('flumecodec/json')
  })

  return toCompat(raf)
}, function () {
  console.log('done')
})
