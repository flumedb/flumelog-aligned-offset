# flumelog-aligned-offset

a new flumelog format.
like [flumelog-offset](https://github.com/flumedb/flumelog-offset),
each record is identified by an integer byte offset, and also,
each record is delimited by it's length.
But unlike `flumelog-offset` records within blocks are always
aligned to the start of the block, so there is no overlap,
and this makes it easy to know wether you have the block for a record
or not.

```
<block
  <record
    <record.length: UInt16LE>
    <record.data>
    <record.length: UInt16LE>
  </record>*
  <footer
    <end sentinel 0xffff>
    <filler: zeros...>
    <pointer.footer: UInt32LE>
  >//end of block.
>
```
to find the start of the record, take the offset, read 2 bytes (little endian)
then `record.data` from `offset + 2`, to `offset + 2 + length`.
the first record in a block starts at the first byte in the block.

The last record in the block is followed by padding.
The block's last 4 bytes contains a 4 byte (little endian)
pointer to the start of the padding, two bytes before that is
the length of the record. Records and padding can always be written
append only, without overwriting previous records.

## License

MIT


