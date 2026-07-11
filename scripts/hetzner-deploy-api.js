/**
 * Sadece API deploy (OAuth fix vb.) + bekleyen Prisma migration'larını uygular.
 */
const { Client } = require("ssh2");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { loadGoogleOAuthEnv } = require("./load-google-oauth-env");

const PASS = process.env.HETZNER_PASS;
const ROOT = path.resolve(__dirname, "..");
const TAR = path.join(ROOT, "hetzner-api.tar.gz");

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
  `tar -czf "${TAR}" --exclude=node_modules --exclude=dist --exclude=api/.env api`,
  { cwd: ROOT, shell: true },
);

const google = loadGoogleOAuthEnv(ROOT);

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          const r = fs.createReadStream(TAR);
          const w = sftp.createWriteStream("/opt/turkexpatlar/hetzner-api.tar.gz");
          w.on("close", resolve);
          w.on("error", reject);
          r.pipe(w);
        });
      });
      await exec(
        conn,
        "cd /opt/turkexpatlar && tar xzf hetzner-api.tar.gz && rm hetzner-api.tar.gz",
        "API güncelleme",
      );
      const envPatch = `
cd /opt/turkexpatlar/api
grep -q '^GOOGLE_CLIENT_ID=' .env && sed -i 's|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${google.id}|' .env || echo 'GOOGLE_CLIENT_ID=${google.id}' >> .env
grep -q '^GOOGLE_CLIENT_SECRET=' .env && sed -i 's|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${google.secret}|' .env || echo 'GOOGLE_CLIENT_SECRET=${google.secret}' >> .env
npm ci --legacy-peer-deps
npx prisma migrate deploy
npm run build
cd /opt/turkexpatlar
pm2 restart turkexpatlar-api
sleep 3
tail -5 /opt/turkexpatlar/api/logs/api-error-0.log
`;
      await exec(conn, envPatch, "Migration + Build + restart");
    } catch (e) {
      console.error("\nHATA:", e.message);
      process.exitCode = 1;
    } finally {
      if (fs.existsSync(TAR)) fs.unlinkSync(TAR);
      conn.end();
    }
  })
  .connect({ host: process.env.HETZNER_HOST, username: "root", password: PASS });
