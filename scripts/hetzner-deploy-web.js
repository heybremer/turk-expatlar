/**
 * Sadece web deploy (admin sohbet temizleme UI vb.)
 */
const { Client } = require("ssh2");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PASS = process.env.HETZNER_PASS;
const ROOT = path.resolve(__dirname, "..");
const TAR = path.join(ROOT, "hetzner-web.tar.gz");

if (!process.env.HETZNER_HOST || !PASS) {
  console.error("HETZNER_HOST ve HETZNER_PASS ortam değişkenleri gerekli");
  process.exit(1);
}

function exec(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`${label} failed (${code})`));
        else resolve();
      });
    });
  });
}

if (fs.existsSync(TAR)) fs.unlinkSync(TAR);
execSync(
  `tar -czf "${TAR}" --exclude=node_modules --exclude=.next --exclude=web/.env.local web`,
  { cwd: ROOT, shell: true },
);

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          const r = fs.createReadStream(TAR);
          const w = sftp.createWriteStream("/opt/turkexpatlar/hetzner-web.tar.gz");
          w.on("close", resolve);
          w.on("error", reject);
          r.pipe(w);
        });
      });
      await exec(
        conn,
        "cd /opt/turkexpatlar && tar xzf hetzner-web.tar.gz && rm hetzner-web.tar.gz",
        "Web güncelleme",
      );
      await exec(
        conn,
        "cd /opt/turkexpatlar/web && npm ci --legacy-peer-deps && npm run build",
        "Build",
      );
      await exec(conn, "cd /opt/turkexpatlar && pm2 restart turkexpatlar-web", "Restart");
      await exec(
        conn,
        "sleep 3 && pm2 list && curl -s -o /dev/null -w 'WEB:%{http_code}' http://127.0.0.1:3200/",
        "Kontrol",
      );
    } catch (e) {
      console.error("\nHATA:", e.message);
      process.exitCode = 1;
    } finally {
      if (fs.existsSync(TAR)) fs.unlinkSync(TAR);
      conn.end();
    }
  })
  .connect({ host: process.env.HETZNER_HOST, port: 22, username: "root", password: PASS });
