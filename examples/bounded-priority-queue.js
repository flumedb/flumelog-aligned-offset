const binary = require('bipf')

module.exports = function (limit) {
    var sorted = [] // { seq, value, timestampSeekKey }

    return {
	sorted,

	add: function(item) {
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
    }
}
