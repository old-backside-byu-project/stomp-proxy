stomp-proxy
===========

A stomp proxy with frame re-writing and error handling

Stomp is a simple protocol for sending messages that works over both TCP or a websocket.

This project exposes a single simple class that allows for proxying and re-writing stomp frames,
this is useful for exposing a stomp endpoint publicly with custom authentication or custom functionality

# Usage
```JavaScript
var StompProxy = require("stomp-proxy")
// connect to STOMP server, such as rabbitmq speaking stomp
var upstreamConn = net.connect({port: 61613})

// attach a handler for each stomp command
function makeProxy(client, upstream) {
  var proxy = new StompProxy(client, upstream)
  // rewrite frames by passing them to the callback
  proxy.onSubscribe = function(session, frame, cb) {
    frame.headers.destination = "/topic/foo.bar.baz"
    cb(null, frame)
  }
  // send error frames by passing an error to the callback
  proxy.onSend = function(session, frame, cb) {
    cb(new Error("no sends allowed"))
  }
  // support custom auth and sessions (in-memory only)
  proxy.onConnect = function(session, frame, cb) {
    session.username = frame.headers.login
    if (frame.headers.passcode != "crispy_treats") {
      return cb(new Error("invalid passcode"))
    }
    frame.headers.login = "guest"
    frame.headers.passcode = "guest"
    cb(null, frame)
  }

  // rewrite frames from the server
  proxy.onMessage = function(session, frame, cb) {
    frame.headers["proxy-via"] = "stomp-proxy"
    frame.headers.user = session.username
    cb(null, frame)
  }

  // you need to call start after attaching handlers
  proxy.start()
  return proxy
}
// can be TCP
var server = net.createServer(function(conn) {
  var proxy = makeProxy(conn, upstreamConn)
})
// or a websocket
shoe(function(conn) {
  var proxy = makeProxy(conn, upstreamConn)
})
```

### Other random features
* Support arbitrary stomp commands to add your own functions
```JavaScript
// just attach a handler, client would send DELETE
proxy.onDelete = function(session, frame, cb) {
  myApi.delete(frame.headers.destination, function(err) {
    if (err) return cb(err)

    // don't send the frame back to the upstream as it wouldn't understand the method
    cb()
  })
}
```
* Passthrough mode when you don't want to rewrite in one direction
```JavaScript
// we don't wan to rewrite server frames, can be slightly more efficent
var proxy = new StompProxy(client, upstream, {serverPassthrough: true})
```

# License
MIT

# TODO
1. Add a way to sync/persist sessions between multiple hosts

# Contributing
Open a PR, add a test
