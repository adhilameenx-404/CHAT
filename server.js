const PAGE_HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>CodeChat</title>\n<style>\n:root{--bg:#f6f5f1;--card:#fff;--ink:#1d1d1b;--mute:#6b6a64;--line:#e2e0d8;--acc:#3d5afe;--accink:#fff;--them:#ecebe4;color-scheme:light}\n@media (prefers-color-scheme:dark){:root{--bg:#161615;--card:#212120;--ink:#f0efe9;--mute:#9b9a92;--line:#34332f;--acc:#5a6cff;--them:#2d2c29;color-scheme:dark}}\n*{box-sizing:border-box}\nbody{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}\nmain{max-width:560px;margin:0 auto;padding:20px 16px;display:flex;flex-direction:column;gap:16px}\nh1{font-size:22px;margin:0}\n.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}\n.lbl{font-size:13px;color:var(--mute);margin:0 0 6px}\n.code{font:700 40px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em}\n.row{display:flex;gap:8px}\ninput{flex:1;min-width:0;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit}\nbutton{padding:11px 16px;border:0;border-radius:10px;background:var(--acc);color:var(--accink);font:inherit;font-weight:600;cursor:pointer}\nbutton.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}\nbutton:disabled{opacity:.5;cursor:default}\n#join{text-transform:uppercase;letter-spacing:.1em}\n#err{color:#d33;font-size:14px;min-height:20px;margin:6px 0 0}\n#status{font-size:14px;color:var(--mute);display:flex;align-items:center;gap:8px;margin:0 0 10px}\n.dot{width:9px;height:9px;border-radius:50%;background:#bbb}.dot.on{background:#2bb673}\n#log{height:min(46vh,380px);overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px 2px 10px}\n.m{max-width:80%;padding:8px 12px;border-radius:14px;background:var(--them);overflow-wrap:anywhere}\n.m.me{align-self:flex-end;background:var(--acc);color:var(--accink)}\n.m small{display:block;font-size:11px;opacity:.7}\n.empty{color:var(--mute);font-size:14px;text-align:center;margin:auto}\n</style>\n</head>\n<body>\n<main>\n  <h1>CodeChat</h1>\n  <div class=\"card\">\n    <p class=\"lbl\">Your code: share it with someone</p>\n    <div class=\"row\" style=\"align-items:center;justify-content:space-between\">\n      <div class=\"code\" id=\"mycode\">\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7</div>\n      <button class=\"ghost\" id=\"copy\">Copy</button>\n    </div>\n  </div>\n  <div class=\"card\">\n    <p class=\"lbl\">Have a friend\u2019s code? Enter it to connect</p>\n    <div class=\"row\">\n      <input id=\"join\" maxlength=\"6\" placeholder=\"ABC123\" autocomplete=\"off\" spellcheck=\"false\">\n      <button id=\"go\" disabled>Connect</button>\n    </div>\n    <p id=\"err\"></p>\n  </div>\n  <div class=\"card\">\n    <p id=\"status\"><span class=\"dot\" id=\"dot\"></span><span id=\"stext\">Connecting\u2026</span></p>\n    <div id=\"log\"><p class=\"empty\">No messages yet.</p></div>\n    <div class=\"row\">\n      <input id=\"msg\" maxlength=\"500\" placeholder=\"Type a message\" autocomplete=\"off\" disabled>\n      <button id=\"send\" disabled>Send</button>\n    </div>\n    <p style=\"margin:10px 0 0\"><button class=\"ghost\" id=\"leave\" hidden>Leave chat</button></p>\n  </div>\n</main>\n<script>\n(function(){\nvar $=function(id){return document.getElementById(id)};\nvar ws=null,myCode=\"\",peer=null,retry=0;\nvar re=/^[A-Za-z]{3}[0-9]{3}$/;\n\nfunction saved(){try{return localStorage.getItem(\"cc_code\")||\"\"}catch(e){return \"\"}}\nfunction keep(c){try{localStorage.setItem(\"cc_code\",c)}catch(e){}}\nfunction status(on,t){$(\"dot\").className=\"dot\"+(on?\" on\":\"\");$(\"stext\").textContent=t}\nfunction clearLog(){var l=$(\"log\");l.innerHTML=\"\";var p=document.createElement(\"p\");p.className=\"empty\";p.textContent=\"No messages yet.\";l.appendChild(p)}\nfunction add(text,me){\n  var l=$(\"log\"),e=l.querySelector(\".empty\");if(e)e.remove();\n  var b=document.createElement(\"div\");b.className=\"m\"+(me?\" me\":\"\");\n  var s=document.createElement(\"small\");s.textContent=me?\"You\":(peer||\"Friend\");\n  var x=document.createElement(\"span\");x.textContent=text;\n  b.appendChild(s);b.appendChild(x);l.appendChild(b);l.scrollTop=l.scrollHeight;\n}\nfunction ui(){\n  var inChat=!!peer;\n  $(\"msg\").disabled=!inChat;$(\"send\").disabled=!inChat;$(\"leave\").hidden=!inChat;\n  $(\"go\").disabled=!(ws&&ws.readyState===1&&myCode);\n  if(inChat)status(true,\"Connected with \"+peer);\n  else if(ws&&ws.readyState===1)status(true,\"Online. Waiting for someone to enter your code\u2026\");\n}\nfunction open(){\n  var proto=location.protocol===\"https:\"?\"wss://\":\"ws://\";\n  ws=new WebSocket(proto+location.host);\n  ws.onopen=function(){retry=0;ws.send(JSON.stringify({type:\"hello\",code:saved()}))};\n  ws.onmessage=function(ev){\n    var m;try{m=JSON.parse(ev.data)}catch(e){return}\n    if(m.type===\"code\"){myCode=m.code;keep(myCode);$(\"mycode\").textContent=myCode;ui()}\n    else if(m.type===\"connected\"){peer=m.code;clearLog();$(\"err\").textContent=\"\";ui()}\n    else if(m.type===\"msg\"&&typeof m.text===\"string\")add(m.text.slice(0,500),false);\n    else if(m.type===\"peer_left\"){add(\"Your friend left the chat.\",false);peer=null;ui()}\n    else if(m.type===\"left\"){peer=null;clearLog();ui()}\n    else if(m.type===\"error\")$(\"err\").textContent=String(m.text||\"Error\");\n  };\n  ws.onclose=function(){\n    peer=null;ui();status(false,\"Disconnected. Reconnecting\u2026\");$(\"go\").disabled=true;\n    setTimeout(open,Math.min(1000*Math.pow(2,retry++),10000));\n  };\n}\n$(\"copy\").onclick=function(){\n  try{navigator.clipboard.writeText(myCode);$(\"copy\").textContent=\"Copied\"}catch(e){$(\"copy\").textContent=\"Select it\"}\n  setTimeout(function(){$(\"copy\").textContent=\"Copy\"},1500);\n};\n$(\"go\").onclick=function(){\n  var v=$(\"join\").value.trim();$(\"err\").textContent=\"\";\n  if(!re.test(v)){$(\"err\").textContent=\"A code is 3 letters followed by 3 numbers, like ABC123.\";return}\n  if(v.toUpperCase()===myCode){$(\"err\").textContent=\"That\u2019s your own code. Share it with someone else.\";return}\n  ws.send(JSON.stringify({type:\"connect\",code:v}));\n};\n$(\"join\").addEventListener(\"keydown\",function(e){if(e.key===\"Enter\")$(\"go\").click()});\n$(\"leave\").onclick=function(){ws.send(JSON.stringify({type:\"leave\"}))};\nfunction send(){\n  var t=$(\"msg\").value.trim();if(!t||!peer)return;\n  ws.send(JSON.stringify({type:\"msg\",text:t}));add(t,true);$(\"msg\").value=\"\";\n}\n$(\"send\").onclick=send;\n$(\"msg\").addEventListener(\"keydown\",function(e){if(e.key===\"Enter\")send()});\nopen();\n})();\n</script>\n</body>\n</html>\n";
const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const page = Buffer.from(PAGE_HTML, "utf8");
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
