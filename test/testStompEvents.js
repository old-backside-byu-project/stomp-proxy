
var Frame = require("stompjs").Frame
var assert = require("assert")
var Duplex = require("./fixtures/faux-duplex")
var async = require("async")

var StompProxy = require("../index.js")

var commands = [
  "STOMP",
  "CONNECT",
  "SEND",
  "SUBSCRIBE",
  "UNSUBSCRIBE",
  "ACK",
  "NACK",
  "BEGIN",
  "COMMIT",
  "ABORT",
  "DISCONNECT"
]

describe("StompProxy", function() {
  describe("message tests", function() {
    async.each(commands, function(command, cb) {
      it("should support the " + command + " command", function(done) {
        var client = new Duplex()
        var server = new Duplex()
        var proxy = new StompProxy(client, server)

        var method = "on" + (command.charAt(0) + command.toLowerCase().substr(1))
        var wasCalled = false

        console.log(method)
        proxy[method] = function(session, frame, cb) {
          console.log("being called")
          wasCalled = true
          cb(null, frame)
        }

        proxy.start()
        var str = Frame.marshall(command, {stuff: "foo"}, "1234")
        server.on("readable", function(data) {
          data = data.toString("utf8")
          var nf = Frame.unmarshall(data)
          assert(nf.length, 1)
          assert(nf[0].command, command)
          assert(wasCalled)
          cb()
          return done()
        })
        client.inRStream.write(str)

      })
    }, function(err) {
      if (err) throw err
    })
  })
})
