

var RAF = require('random-access-file')

var raf = RAF('/tmp/test-raf_write-read')

var blockSize = 64*1024

var c = 0
;(function next () {
  if(c > 1024*1024*200) return console.log('done')
  var buffer = require('crypto').randomBytes(blockSize)
  raf.write(c, buffer, function (err) {
    console.log(c)
    if(err) throw err
    raf.read(c, blockSize, function (err) {
      if(err) throw err
      c+=blockSize
      next()
    })
  })
})()

