This is a minimal example to reproduce an issue with Deno's `Request.text()` API.

> Since we are using wrk, you need a UNIX-like operating system

## Install wrk

wrk is a HTTP benchmarking tool that is able to generate significant load.

Install wrk on Ubuntu:

```shell
sudo apt update
sudo apt install wrk
```

Or build from source:

```shell
git clone git@github.com:wg/wrk.git
cd wrk
sudo make
```

## Run the bug reproduction

The `bug-repro.ts` script starts a server (`server.ts`) and runs a short (1s) load test using wrk and stops the server.
It repeats this 10 times.

```shell
deno run -A bug-repro.ts
```

Which should output something like (note the randomly occurring `BadResource` error):

```
$ deno run -A bug-repro.ts
Run 1: Server started.
Listening on http://0.0.0.0:8000/
Run 1: wrk load test started.
Running 1s test @ http://localhost:8000
  1 threads and 300 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     2.73ms    0.87ms  11.20ms   94.16%
    Req/Sec   111.88k    17.42k  120.26k    90.00%
  111002 requests in 1.05s, 16.30MB read
Requests/sec: 105326.98
Transfer/sec:     15.47MB
Run 1: Server stopped.
Run 2: Server started.
Listening on http://0.0.0.0:8000/
Run 2: wrk load test started.
Running 1s test @ http://localhost:8000
  1 threads and 300 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     2.73ms  614.60us  10.18ms   90.08%
    Req/Sec   110.42k    14.12k  125.07k    80.00%
  109650 requests in 1.04s, 16.10MB read
Requests/sec: 105530.10
Transfer/sec:     15.50MB
BadResource: Bad resource ID
    at readableStreamCollectIntoUint8Array (ext:deno_web/06_streams.js:1060:23)
    at InnerBody.consume (ext:deno_fetch/22_body.js:163:14)
    at consumeBody (ext:deno_fetch/22_body.js:255:34)
    at Request.text (ext:deno_fetch/22_body.js:351:16)
    at file:///home/putzisan/dev_projects/deno-server-bug-repro/server.ts:1:50
    at ext:deno_http/00_serve.ts:382:26
    at ext:deno_http/00_serve.ts:593:29
    at eventLoopTick (ext:core/01_core.js:175:7) {
  name: "BadResource"
}
Run 2: Server stopped.
Run 3: Server started.
...
Run 10: Server stopped.
```

### Observations

The error occurs only on the end of a load test run, but not on every run.

The error probably happens when the TCP connection is closed before the request is fully read.

See this wireshark capture for a failed request:

```
495880	2024-11-26 09:35:57,705529846	127.0.0.1	127.0.0.1	HTTP/JSON	207	POST / HTTP/1.1 , JavaScript Object Notation (application/json)
496787	2024-11-26 09:35:57,714119877	127.0.0.1	127.0.0.1	TCP	66	56952 → 8080 [FIN, ACK] Seq=14383 Ack=10808 Win=65536 Len=0 TSval=658758687 TSecr=658758679
497150	2024-11-26 09:35:57,716091194	127.0.0.1	127.0.0.1	TCP	66	8080 → 56952 [FIN, ACK] Seq=10808 Ack=14384 Win=65536 Len=0 TSval=658758689 TSecr=658758679
497151	2024-11-26 09:35:57,716093907	127.0.0.1	127.0.0.1	TCP	66	56952 → 8080 [ACK] Seq=14384 Ack=10809 Win=65536 Len=0 TSval=658758689 TSecr=658758689
```

So the last POST request was sent and immediately after the client closed the connection (and the server responded correctly with a FIN, ACK).