/**
 * Tek seferlik: GitHub Actions deploy anahtarı + secret'ları kurar.
 * Kullanım: node scripts/setup-github-deploy.js
 */
const { Client } = require("ssh2");
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const KEY_DIR = path.join(ROOT, ".deploy-keys");
const KEY_PATH = path.join(KEY_DIR, "github-actions");
const HOST = "159.69.23.193";
const USER = "root";
const APP_DIR = "/opt/turkexpatlar";

function readPass() {
  if (process.env.HETZNER_PASS) return process.env.HETZNER_PASS;
  const credPath = path.join(ROOT, "hetznersifre.md");
  const m = fs.readFileSync(credPath, "utf8").match(/Password\s+(\S+)/i);
  if (!m) throw new Error("hetznersifre.md veya HETZNER_PASS gerekli");
  return m[1];
}

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.stderr.on("data", (d) => (out += d.toString()));
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`SSH failed (${code}): ${out}`));
        else resolve(out);
      });
    });
  });
}

async function main() {
  if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true });

  if (!fs.existsSync(KEY_PATH)) {
    execSync(`ssh-keygen -t ed25519 -f "${KEY_PATH}" -N "" -C "github-actions-turkexpatlar"`, {
      stdio: "inherit",
    });
  }

  const pubKey = fs.readFileSync(`${KEY_PATH}.pub`, "utf8").trim();
  const privKey = fs.readFileSync(KEY_PATH, "utf8");
  const marker = "github-actions-turkexpatlar";

  const pass = readPass();
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host: HOST, port: 22, username: USER, password: pass });
  });

  try {
    await sshExec(
      conn,
      `mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qF '${marker}' ~/.ssh/authorized_keys 2>/dev/null || echo '${pubKey}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`,
    );
    console.log("✓ Sunucuya deploy anahtarı eklendi");
  } finally {
    conn.end();
  }

  execSync(`gh secret set SSH_HOST --body "${HOST}"`, { cwd: ROOT, stdio: "inherit" });
  execSync(`gh secret set SSH_USER --body "${USER}"`, { cwd: ROOT, stdio: "inherit" });
  execSync(`gh secret set APP_DIR --body "${APP_DIR}"`, { cwd: ROOT, stdio: "inherit" });
  execSync(`gh secret set SSH_PRIVATE_KEY < "${KEY_PATH}"`, {
    cwd: ROOT,
    shell: true,
    stdio: "inherit",
  });

  console.log("\n✓ GitHub secret'ları ayarlandı: SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, APP_DIR");
  console.log("  Akış: git push origin main → GitHub Actions → SSH → production-deploy.sh");
  console.log(`  Anahtar dosyası: ${KEY_DIR} (.gitignore'da)`);
}

main().catch((e) => {
  console.error("HATA:", e.message);
  process.exit(1);
});
