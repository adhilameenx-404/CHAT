const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const page = fs.readFileSync(path.join(__dirname, "public", "index.html"));
const FORMAT = /^[A-Z]{3}[0-9]{3}$/;
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const online = new Map(); // code -> ws

const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200); return res.end("ok"); }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page);
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });

function genCode() {
  for (let n = 0; n < 1000; n++) {
    let c = "";
    for (let i = 0; i < 3; i++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    for (let i = 0; i < 3; i++) c += Math.floor(Math.random() * 10);
    if (!online.has(c)) return c;
  }
  return null;
}
const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };
function unpair(ws, notify) {
  const p = ws.peer;
  if (!p) return;
  ws.peer = null; p.peer = null;
  if (notify) send(p, { type: "peer_left", code: ws.code });
}

wss.on("connection", (ws) => {
  ws.alive = true; ws.peer = null; ws.code = null; ws.hits = [];
  ws.on("pong", () => { ws.alive = true; });

  ws.on("message", (raw) => {
    const now = Date.now();
    ws.hits = ws.hits.filter((t) => now - t < 5000);
    if (ws.hits.push(now) > 25) return; // rate limit
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.type !== "string") return;

    if (m.type === "hello" && !ws.code) {
      let want = typeof m.code === "string" ? m.code.toUpperCase() : "";
      ws.code = FORMAT.test(want) && !online.has(want) ? want : genCode();
      if (!ws.code) return ws.close();
      online.set(ws.code, ws);
      return send(ws, { type: "code", code: ws.code });
    }
    if (!ws.code) return;

    if (m.type === "connect") {
      const target = online.get(String(m.code || "").toUpperCase());
      if (!target || target === ws) return send(ws, { type: "error", text: "No user is online with that code." });
      if (ws.peer) return send(ws, { type: "error", text: "You are already in a chat. Leave it first." });
      if (target.peer) return send(ws, { type: "error", text: "That user is already chatting with someone." });
      ws.peer = target; target.peer = ws;
      send(ws, { type: "connected", code: target.code });
      send(target, { type: "connected", code: ws.code });
    } else if (m.type === "msg") {
      const text = typeof m.text === "string" ? m.text.trim().slice(0, 500) : "";
      if (text && ws.peer) send(ws.peer, { type: "msg", text });
    } else if (m.type === "leave") {
      unpair(ws, true);
      send(ws, { type: "left" });
    }
  });

  ws.on("close", () => {
    unpair(ws, true);
    if (ws.code && online.get(ws.code) === ws) online.delete(ws.code);
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.alive) return ws.terminate();
    ws.alive = false; ws.ping();
  });
}, 30000);

server.listen(PORT, () => console.log("CodeChat running on port " + PORT));
