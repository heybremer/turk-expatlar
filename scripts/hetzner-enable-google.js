/**
 * google-oauth.env → sunucu api/.env güncelle + API restart
 * Kullanım: $env:HETZNER_PASS="..."; node scripts/hetzner-enable-google.js
 */
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");
const { loadGoogleOAuthEnv } = require("./load-google-oauth-env");

const PASS = process.env.HETZNER_PASS;
const ROOT = path.resolve(__dirname, "..");
const google = loadGoogleOAuthEnv(ROOT);

if (!PASS) {
  console.error("HETZNER_PASS gerekli");
  process.exit(1);
}

if (
  !google.id ||
  google.id === "DISABLED" ||
  !google.secret ||
  google.secret === "DISABLED"
) {
  console.error("google-oauth.env dosyasında GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET dolu olmalı");
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

const envPatch = `
cd /opt/turkexpatlar/api
grep -q '^GOOGLE_CLIENT_ID=' .env && sed -i 's|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${google.id}|' .env || echo 'GOOGLE_CLIENT_ID=${google.id}' >> .env
grep -q '^GOOGLE_CLIENT_SECRET=' .env && sed -i 's|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${google.secret}|' .env || echo 'GOOGLE_CLIENT_SECRET=${google.secret}' >> .env
grep -q '^API_URL=' .env && sed -i 's|^API_URL=.*|API_URL=https://api.turkexpatlar.de|' .env || echo 'API_URL=https://api.turkexpatlar.de' >> .env
pm2 restart turkexpatlar-api
sleep 3
curl -sI https://api.turkexpatlar.de/api/auth/google | head -5
`;

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      await exec(conn, envPatch, "Google OAuth + API restart");
      console.log("\n✓ Google OAuth etkin. https://turkexpatlar.de/kayit adresinden test edin.");
    } catch (e) {
      console.error("\nHATA:", e.message);
      process.exitCode = 1;
    } finally {
      conn.end();
    }
  })
  .connect({ host: "159.69.23.193", port: 22, username: "root", password: PASS });
