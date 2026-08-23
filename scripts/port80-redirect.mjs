// Runs locally to ensure UddoktaPay redirects from http://localhost/dashboard/...
// to http://localhost:1511/dashboard/... seamlessly without needing any ngrok or tunnels!
import http from "node:http";

const TARGET_PORT = 1511;

try {
  const server = http.createServer((req, res) => {
    const targetUrl = `http://localhost:${TARGET_PORT}${req.url}`;
    res.writeHead(302, { Location: targetUrl });
    res.end();
  });

  server.on("error", () => {
    // Port 80 might already be bound — ignore gracefully.
  });

  server.listen(80, () => {
    console.log(`  ✔ Local Port 80 redirector active (http://localhost -> http://localhost:${TARGET_PORT})\n`);
  });
} catch {
  // Ignore
}
