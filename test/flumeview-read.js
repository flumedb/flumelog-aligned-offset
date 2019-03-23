
var Flume = require('flumedb')
var Index = require('flumeview-level')
var codec = require('flumecodec')

var create = require('..')

var toCompat = require('../compat')

require('test-flumeview-index/read')(function (filename, seed) {
  var raf = create(filename+'/aligned.log', {
    blockSize: 1024*64,
    codec: require('flumecodec/json')
  })

  return Flume(toCompat(raf))
    .use('index', Index(1, function (e) {
      console.log(e)
      return [e.key]
    }))
})






















