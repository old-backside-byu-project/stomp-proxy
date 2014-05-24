
var Frame = require("stompjs").Frame
var assert = require("assert")
var async = require("async")
var net = require("net")

var StompProxy = require("../index.js")

var remoteCommands = [
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

var serverCommands = [
  "CONNECTED",
  "MESSAGE",
  "RECEIPT",
  "ERROR"
]
describe("StompProxy", function() {
  describe("message tests", function() {
    var remoteServer = null
    var localServer = null
    var remoteConn = null
    var localConn = null

    var toRemoteClient = null
    var toLocalClient = null
    var proxy = null
    before(function(done) {
      remoteServer = net.createServer(function(c) {
        remoteConn = c
      })
      localServer = net.createServer(function(c) {
        localConn = c
      })
      remoteServer.listen(0, function() {
        var port = remoteServer.address().port
        toRemoteClient = net.connect(port, function() {
          localServer.listen(0, function() {
            var port = localServer.address().port
            toLocalClient = net.connect(port, function() {
              // quick timeout to ensure the handler is called
              setTimeout(function() {
                proxy = new StompProxy(localConn, toRemoteClient)
                proxy.start()
                done()
              }, 10)
            })
          })
        })
      })
    })

    remoteCommands.forEach(function(command) {
      it("should support the remote " + command + " command", function(done) {

        var method = "on" + (command.charAt(0) + command.toLowerCase().substr(1))
        var wasCalled = false

        proxy[method] = function(session, frame, acb) {
          wasCalled = true
          acb(null, frame)
        }

        var str = Frame.marshall(command, {stuff: "foo"}, "1234")
        remoteConn.once("data", function(data) {
          data = data.toString("utf8")
          var nf = Frame.unmarshall(data)
          assert(nf.length, 1)
          assert(nf[0].command, command)
          assert(wasCalled)
          return done()
        })
        toLocalClient.write(str)
      })
    })

    serverCommands.forEach(function(command) {
      it("should support the server " + command + " command", function(done) {

        var method = "on" + (command.charAt(0) + command.toLowerCase().substr(1))
        var wasCalled = false

        proxy[method] = function(session, frame, acb) {
          wasCalled = true
          acb(null, frame)
        }

        var str = Frame.marshall(command, {stuff: "foo"}, "1234")
        toLocalClient.once("data", function(data) {
          data = data.toString("utf8")
          var nf = Frame.unmarshall(data)
          assert(nf.length, 1)
          assert(nf[0].command, command)
          assert(wasCalled)
          return done()
        })
        remoteConn.write(str)
      })
    })

    it("should interject an error frame when we callback with an error", function(done) {
      proxy.onSend = function(session, frame, cb) {
        cb(new Error("an error"))
      }

      var str = Frame.marshall("SEND", {stuff: "foo"}, "1234")
      toLocalClient.once("data", function(data) {
        data = data.toString("utf8")
        var nf = Frame.unmarshall(data)
        assert(nf.length, 1)
        assert(nf[0].command, "ERROR")
        return done()
      })
      toLocalClient.write(str)
    })

    it("should support arbitrary frames", function(done) {
      var wasCalled = false
      proxy.onFoo = function(session, frame, cb) {
        wasCalled = true
        cb(null, frame)
      }

      var str = Frame.marshall("FOO", {stuff: "foo"}, "1234")
      remoteConn.once("data", function(data) {
        data = data.toString("utf8")
        var nf = Frame.unmarshall(data)
        assert(nf.length, 1)
        assert(nf[0].command, "FOO")
        assert(wasCalled)
        return done()
      })
      toLocalClient.write(str)
    })

    it("should allow frames to be rewritten", function(done) {
      var wasCalled = false
      proxy.onSend = function(session, frame, cb) {
        frame.headers.stuff = "other"
        frame.command = "BOOP"
        wasCalled = true
        cb(null, frame)
      }

      var str = Frame.marshall("SEND", {stuff: "foo"}, "1234")
      remoteConn.once("data", function(data) {
        data = data.toString("utf8")
        var nf = Frame.unmarshall(data)
        assert(nf.length, 1)
        assert(nf[0].command, "BOOP")
        assert(nf[0].headers.stuff, "other")
        assert(wasCalled)
        return done()
      })
      toLocalClient.write(str)
    })

  })
})
