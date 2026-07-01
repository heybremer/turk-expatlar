/**
 * Sunucu erişim ve Node/PM2 kontrolü.
 * Kullanım: set SSH_PASS=... && node scripts/server-probe.js
 */
const { Client } = require("ssh2");

const host = process.env.SSH_HOST || "access-5020523952.webspace-host.com";
const user = process.env.SSH_USER || "su1182926";
const pass = process.env.SSH_PASS;

if (!pass) {
  console.error("SSH_PASS ortam değişkeni gerekli.");
  process.exit(1);
}

const cmd =
  "uname -a; echo '---'; which node npm npx pm2 git 2>/dev/null; echo '---'; node -v 2>/dev/null; npm -v 2>/dev/null; echo '---'; pwd; ls -la ~ 2>/dev/null | head -25";

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err);
        conn.end();
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", () => conn.end());
    });
  })
  .on("error", (e) => {
    console.error("SSH hata:", e.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username: user, password: pass });
