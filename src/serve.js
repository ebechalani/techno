#!/usr/bin/env node
/** Petit serveur local pour prévisualiser docs/ : node src/serve.js [port] */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "docs");
const PORT = Number(process.argv[2]) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    const file = path.join(ROOT, path.normalize(urlPath));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) {
        // essaie <chemin>/index.html
        fs.readFile(path.join(ROOT, urlPath, "index.html"), (err2, data2) => {
          if (err2) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("404"); }
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          res.end(data2);
        });
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`Prévisualisation : http://localhost:${PORT}/`));
