// scan through a bipf log, looking for particular values.
// it's a brute force search! but it's really fast because
// no parsing. not really much different than just dumping the file!!!

var FlumeLogRaf = require('../')
var Looper = require('looper')
var raf = FlumeLogRaf(process.argv[2], {block: 64*1024})
var binary = require('bipf')
var path = require('path')
var FastBitSet = require('typedfastbitset')
var fs = require('fs')
var push = require('push-stream')

var _timestamp = new Buffer('timestamp')
var _author = new Buffer('author')
var _type = new Buffer('type')
var _channel = new Buffer('channel')
var _content = new Buffer('content')
var _value = new Buffer('value')
var _post = new Buffer('post')
var _text = new Buffer('text')

var _channelValue = new Buffer('solarpunk')
var _postValue = new Buffer('post')
var _authorValue = new Buffer('@6CAxOI3f+LUOVrbAl0IemqiS7ATpQvr9Mdw9LC4+Uv0=.ed25519')

var start = Date.now()
var count = 0

var channelBitset = new FastBitSet()
var postBitset = new FastBitSet()
var authorBitset = new FastBitSet()

var intOffset = new Uint32Array(1 * 1000 * 1000) // FIXME: fixed size

function saveTypedArray(name, arr)
{
  fs.writeFileSync(name + ".index", Buffer.from(arr.buffer))
}

function loadTypedArray(name)
{
  var buf = fs.readFileSync(name + ".index")
  return new Uint32Array(buf.buffer, buf.offset, buf.byteLength/4)
}

//var test = loadTypedArray("offset")

// boundedPriorityQueue
// this is 80ms on 114k!
var sorted = [] // { seq, value, timestampSeekKey }
var limit = 10
function maintainLargestSort(item) {
  if (sorted.length < limit) {
    sorted.push(item)
    sorted.sort(function (a, b) {
      return binary.compare(a.value, a.timestampSeekKey,
                            b.value, b.timestampSeekKey)
    })
  }
  else {
    if (binary.compare(item.value, item.timestampSeekKey,
                       sorted[0].value, sorted[0].timestampSeekKey)) {
      sorted[0] = item
      sorted.sort(function (a, b) {
        return binary.compare(a.value, a.timestampSeekKey,
                              b.value, b.timestampSeekKey)
      })
    }
  }
}

raf.stream({}).pipe({
  paused: false,
  write: function (data) {
    var seq = data.seq
    var buffer = data.value

    intOffset[count] = seq

    var p = 0 // note you pass in p!
    p = binary.seekKey(buffer, p, _value)

    var p3 = binary.seekKey(buffer, p, _author)
    if(~p3) {
      if(binary.compareString(buffer, p3, _authorValue) === 0)
        authorBitset.add(count)
    }

    if(~p) {
      p = binary.seekKey(buffer, p, _content)
      if(~p) {
        var p2 = binary.seekKey(buffer, p, _type)
        if(~p2) {
          if(binary.compareString(buffer, p2, _postValue) === 0)
            postBitset.add(count)
        }

        p = binary.seekKey(buffer, p, _channel)
        if(~p) {
          if(binary.compareString(buffer, p, _channelValue) === 0)
            channelBitset.add(count)
        }
      }
    }

    count++
  },
  end: () => {
    console.log(`time: ${Date.now()-start}ms, total items: ${count}`)
    console.log("post", postBitset.size())
    console.log("channel solarpunk", channelBitset.size())
    console.log("arj author", authorBitset.size())

    console.time("intersect")
    var both = authorBitset.new_intersection(channelBitset)
    console.timeEnd("intersect") // 2.5ms!
    console.log("results:", both.size())

    function sortData(data) {
      var p = 0 // note you pass in p!
      p = binary.seekKey(data.value, p, _value)
      data.timestampSeekKey = binary.seekKey(data.value, p, _timestamp)

      maintainLargestSort(data)
    }

    const util = require('util')

    console.time("get values and sort top 10")

    push(
      push.values(both.array()),
      push.asyncMap((val, cb) => {
        var seq = intOffset[val]
        raf.get(seq, (err, value) => {
          sortData({ seq, value })
          cb()
        })
      }),
      push.collect(() => {
        console.timeEnd("get values and sort top 10")
        sorted.map(x => binary.decode(x.value, 0)).forEach(x => {
          console.log(util.inspect(x, false, null, true /* enable colors */))
        })
      })
    )

    saveTypedArray("offset", intOffset) // 1mb
    saveTypedArray("post", postBitset.words) // 20kb!
    saveTypedArray("author", authorBitset.words)
    saveTypedArray("channel", channelBitset.words)
  }
})
