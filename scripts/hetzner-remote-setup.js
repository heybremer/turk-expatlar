/**
 * Hetzner CX33 ilk kurulum + proje yükleme + deploy
 * Kullanım: node scripts/hetzner-remote-setup.js
 */
const { Client } = require("ssh2");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HOST = process.env.HETZNER_HOST || "159.69.23.193";
const USER = process.env.HETZNER_USER || "root";
const PASS = process.env.HETZNER_PASS;
const ROOT = path.resolve(__dirname, "..");
const TAR = path.join(ROOT, "hetzner-deploy.tar.gz");

if (!PASS) {
  console.error("HETZNER_PASS gerekli");
  process.exit(1);
}

console.log("==> Paket oluşturuluyor...");
if (fs.existsSync(TAR)) fs.unlinkSync(TAR);
execSync(
  `tar -czf "${TAR}" --exclude=node_modules --exclude=.next --exclude=dist --exclude=.git --exclude=hetzner-deploy.tar.gz --exclude=api/.env --exclude=web/.env.local api web ecosystem.config.js scripts hetzner.md`,
  { cwd: ROOT, shell: true },
);

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

const conn = new Client();
conn
  .on("ready", async () => {
    console.log("SSH bağlantısı OK\n");
    try {
      await exec(
        conn,
        "apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git curl nginx certbot python3-certbot-nginx ufw",
        "Sistem paketleri",
      );

      await exec(
        conn,
        `if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y -qq nodejs; fi && node -v && npm -v && npm install -g pm2`,
        "Node 20 + PM2",
      );

      await exec(
        conn,
        "ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable",
        "Firewall",
      );

      await exec(conn, "mkdir -p /opt/turkexpatlar", "Dizin");

      // SFTP upload
      console.log("\n==> Proje yükleniyor...");
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          const r = fs.createReadStream(TAR);
          const w = sftp.createWriteStream("/opt/turkexpatlar/hetzner-deploy.tar.gz");
          w.on("close", resolve);
          w.on("error", reject);
          r.pipe(w);
        });
      });

      await exec(
        conn,
        "cd /opt/turkexpatlar && tar xzf hetzner-deploy.tar.gz && rm hetzner-deploy.tar.gz && sed -i 's/\\r$//' scripts/hetzner-*.sh && chmod +x scripts/hetzner-*.sh",
        "Arşiv açılıyor",
      );

      // api/.env
      const dbUrl =
        "postgresql://postgres.puixogwequambqxjhzja:TurkExpatlar88@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
      const redisUrl =
        "rediss://default:gQAAAAAAAeuzAAIgcDIxMjJkZmY2Mzg4NDk0Nzk4Yjg0YTVlZjYyMDY4NWNiZQ@modest-weevil-125875.upstash.io:6379";
      const jwt = "turkexpatlar-prod-jwt-hetzner-2026";

      const apiEnv = [
        "NODE_ENV=production",
        "PORT=3201",
        `DATABASE_URL="${dbUrl}"`,
        `REDIS_URL="${redisUrl}"`,
        `JWT_SECRET="${jwt}"`,
        "JWT_EXPIRES_IN=7d",
        "CORS_ORIGIN=https://turkexpatlar.de",
        "WEB_URL=https://turkexpatlar.de",
        "SITE_URL=https://turkexpatlar.de",
        "GOOGLE_CLIENT_ID=DISABLED",
        "GOOGLE_CLIENT_SECRET=DISABLED",
        "STRIPE_SECRET_KEY=",
        "STRIPE_WEBHOOK_SECRET=",
      ].join("\n");

      const webEnv = [
        "NEXT_PUBLIC_API_URL=https://api.turkexpatlar.de",
        `JWT_SECRET="${jwt}"`,
      ].join("\n");

      await exec(
        conn,
        `cat > /opt/turkexpatlar/api/.env << 'EOF'\n${apiEnv}\nEOF\n cat > /opt/turkexpatlar/web/.env.local << 'EOF'\n${webEnv}\nEOF`,
        ".env dosyaları",
      );

      await exec(conn, "cd /opt/turkexpatlar && bash scripts/hetzner-deploy.sh", "Build + PM2");

      await exec(
        conn,
        "DOMAIN=turkexpatlar.de bash /opt/turkexpatlar/scripts/hetzner-nginx.sh",
        "Nginx + SSL",
      );

      await exec(
        conn,
        "pm2 list && curl -s -o /dev/null -w 'API:%{http_code} ' http://127.0.0.1:3201/api/site-settings/public && curl -s -o /dev/null -w 'WEB:%{http_code}' http://127.0.0.1:3200/",
        "Durum kontrolü",
      );

      console.log("\n✓ Kurulum tamamlandı.");
      console.log("  https://turkexpatlar.de (DNS yayıldıktan sonra)");
      console.log("  https://api.turkexpatlar.de");
      console.log("  Hetzner DNS: A kayıtları @ www api → 159.69.23.193");
    } catch (e) {
      console.error("\nHATA:", e.message);
      process.exitCode = 1;
    } finally {
      if (fs.existsSync(TAR)) fs.unlinkSync(TAR);
      conn.end();
    }
  })
  .on("error", (e) => {
    console.error("SSH:", e.message);
    process.exit(1);
  })
  .connect({ host: HOST, port: 22, username: USER, password: PASS });
