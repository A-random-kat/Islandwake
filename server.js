const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 4174);
const clients = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.on("upgrade", (req, socket) => {
  if (req.headers.upgrade?.toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash("sha1")
    .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n"));
  socket.id = crypto.randomUUID();
  socket.player = null;
  socket.pending = Buffer.alloc(0);
  clients.set(socket.id, socket);
  send(socket, { type: "welcome", id: socket.id });
  socket.on("data", (buffer) => readFrames(socket, buffer));
  socket.on("close", () => leave(socket));
  socket.on("error", () => leave(socket));
});

function leave(socket) {
  if (!clients.has(socket.id)) return;
  clients.delete(socket.id);
  broadcast({ type: "leave", id: socket.id }, socket);
}

function readFrames(socket, chunk) {
  const buffer = socket.pending.length ? Buffer.concat([socket.pending, chunk]) : chunk;
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const frameStart = offset;
    const first = buffer[offset++];
    const second = buffer[offset++];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    if (length === 126) {
      if (offset + 2 > buffer.length) {
        socket.pending = buffer.subarray(frameStart);
        return;
      }
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (offset + 8 > buffer.length) {
        socket.pending = buffer.subarray(frameStart);
        return;
      }
      length = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }
    let mask;
    if (masked) {
      if (offset + 4 > buffer.length) {
        socket.pending = buffer.subarray(frameStart);
        return;
      }
      mask = buffer.subarray(offset, offset + 4);
      offset += 4;
    }
    if (offset + length > buffer.length) {
      socket.pending = buffer.subarray(frameStart);
      return;
    }
    const payload = buffer.subarray(offset, offset + length);
    offset += length;
    if (opcode === 8) return leave(socket);
    if (opcode !== 1) continue;
    const bytes = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      bytes[i] = masked ? payload[i] ^ mask[i % 4] : payload[i];
    }
    handleMessage(socket, bytes.toString("utf8"));
  }
  socket.pending = offset < buffer.length ? buffer.subarray(offset) : Buffer.alloc(0);
}

function handleMessage(socket, text) {
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return;
  }
  if (message.type === "hello" || message.type === "state") {
    socket.player = { ...message.player, id: socket.id, updated: Date.now() };
    broadcast({ type: "state", player: socket.player }, socket);
    if (message.type === "hello") {
      for (const other of clients.values()) {
        if (other !== socket && other.player) send(socket, { type: "state", player: other.player });
      }
    }
  }
  if (message.type === "shot") {
    broadcast({ type: "shot", shot: { ...message.shot, owner: socket.id } }, socket);
  }
}

function broadcast(message, except) {
  for (const client of clients.values()) {
    if (client !== except) send(client, message);
  }
}

function send(socket, message) {
  if (socket.destroyed) return;
  const payload = Buffer.from(JSON.stringify(message));
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

server.listen(port, () => {
  console.log(`Islandwake multiplayer server: http://localhost:${port}`);
});
