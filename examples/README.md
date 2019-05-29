

## examples

### copy.js <source> <dest>

copy a flumelog-offset (json) file into flumelog-aligned-offset (bipf)

### dump.js <source>

read a `flumelog-aligned-offset` file and write it to stdout, as fast as possible.
just reads values as buffers, does no pasing.

### scan.js <source>

scan a `flumelog-aligned-offset` file, in `bipf` format, and scan for posts in the `solarpunk` channel.
This is quite fast because it does not need to look at every byte in the record,
just follow the path to `value.content.channel`.
