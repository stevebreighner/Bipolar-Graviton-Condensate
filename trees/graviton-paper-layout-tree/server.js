const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = 8787;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const TREE_FILE = path.join(DATA_DIR, "tree-data.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const normalized = path.normalize(decodeURIComponent(requestPath)).replace(/^\.\.(\/|\\|$)/, "");
  const filePath = path.join(ROOT_DIR, normalized);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function handleTreeApi(req, res) {
  if (req.method === "GET") {
    fs.readFile(TREE_FILE, "utf8", (err, data) => {
      if (err) {
        if (err.code === "ENOENT") {
          sendJson(res, 404, { error: "No saved tree file yet." });
          return;
        }
        sendJson(res, 500, { error: "Could not read saved tree file." });
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(data);
    });
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) req.destroy();
    });

    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body || "{}");
      } catch (_err) {
        sendJson(res, 400, { error: "Invalid JSON body." });
        return;
      }

      fs.mkdir(DATA_DIR, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          sendJson(res, 500, { error: "Could not prepare data directory." });
          return;
        }

        const pretty = `${JSON.stringify(parsed, null, 2)}\n`;
        fs.writeFile(TREE_FILE, pretty, "utf8", (writeErr) => {
          if (writeErr) {
            sendJson(res, 500, { error: "Could not save tree file." });
            return;
          }

          sendJson(res, 200, {
            ok: true,
            path: TREE_FILE,
            overwritten: true,
          });
        });
      });
    });

    req.on("error", () => {
      sendJson(res, 500, { error: "Request error while saving." });
    });

    return;
  }

  sendJson(res, 405, { error: "Method not allowed." });
}

const server = http.createServer((req, res) => {
  const route = req.url.split("?")[0];
  if (route === "/api/tree" || route === "/api/tree.php") {
    handleTreeApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Decision tree app running at http://${HOST}:${PORT}`);
  console.log(`Saving JSON file at: ${TREE_FILE}`);
});
