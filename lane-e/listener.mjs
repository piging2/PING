// Tiny TCP listener on 127.0.0.1:18923. Logs every connection with timestamp.
// Proves whether a BLOCKED probe ever actually connected (it must not).
import net from "node:net";
import fs from "node:fs";
const LOG = "/tmp/lane-e/connections.log";
fs.writeFileSync(LOG, "");
const srv = net.createServer((sock) => {
  const line = new Date().toISOString() + " CONNECT from " + sock.remoteAddress + ":" + sock.remotePort + "\n";
  fs.appendFileSync(LOG, line);
  let buf = "";
  sock.on("data", (d) => {
    buf += d.toString("utf8");
    if (buf.includes("\r\n\r\n")) {
      const body = "lane-e-listener";
      sock.end("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n" + body);
    }
  });
});
srv.listen(18923, "127.0.0.1", () => console.log("LISTENER-UP"));
