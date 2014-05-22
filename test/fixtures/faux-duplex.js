// shameless lifted from http://codewinds.com/blog/2013-08-31-nodejs-duplex-streams.html, thanks!
var fs = require('fs');
var stream = require('stream');
var util = require('util');

var Duplex = stream.Duplex;

var PassThrough = stream.PassThrough;

/**
 * Duplex stream created with two transform streams
 * - inRStream - inbound side read stream
 * - outWStream - outbound side write stream
 */
function DuplexThrough(options) {
  if (!(this instanceof DuplexThrough)) {
    return new DuplexThrough(options);
  }
  Duplex.call(this, options);
  this.inRStream = new PassThrough();
  this.outWStream = new PassThrough();
}
util.inherits(DuplexThrough, Duplex);

/* left inbound side */
DuplexThrough.prototype._write =
  function (chunk, enc, cb) {
    this.inRStream.write(chunk, enc, cb);
  };

/* left outbound side */
DuplexThrough.prototype._read = function (n) {
  var self = this;
  self.outWStream
    .on('readable', function () {
      var chunk;
      while (null !==
             (chunk = self.outWStream.read(n))) {
        // if push returns false, stop writing
        if (!self.push(chunk)) break;
      }
    })
    .on('end', function () {
      self.push(null); // EOF
    });
};

module.exports = DuplexThrough
