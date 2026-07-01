/**
 * Sadece deploy + nginx (kurulum zaten yapıldıysa)
 */
const { Client } = require("ssh2");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PASS = process.env.HETZNER_PASS;
const ROOT = path.resolve(__dirname, "..");
const TAR = path.join(ROOT, "hetzner-deploy.tar.gz");

const { loadGoogleOAuthEnv } = require("./load-google-oauth-env");

function productionEnv(rootDir) {
  const dbUrl =
    "postgresql://postgres.puixogwequambqxjhzja:TurkExpatlar88@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
  const redisUrl =
    "rediss://default:gQAAAAAAAeuzAAIgcDIxMjJkZmY2Mzg4NDk0Nzk4Yjg0YTVlZjYyMDY4NWNiZQ@modest-weevil-125875.upstash.io:6379";
  const jwt = "turkexpatlar-prod-jwt-hetzner-2026";
  const google = loadGoogleOAuthEnv(rootDir);
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
    "API_URL=https://api.turkexpatlar.de",
    `GOOGLE_CLIENT_ID=${google.id}`,
    `GOOGLE_CLIENT_SECRET=${google.secret}`,
    "STRIPE_SECRET_KEY=",
    "STRIPE_WEBHOOK_SECRET=",
  ].join("\n");
  const webEnv = [
    "NEXT_PUBLIC_API_URL=https://api.turkexpatlar.de",
    `JWT_SECRET="${jwt}"`,
  ].join("\n");
  return { apiEnv, webEnv };
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
  `tar -czf "${TAR}" --exclude=node_modules --exclude=.next --exclude=dist --exclude=.git --exclude=hetzner-deploy.tar.gz --exclude=api/.env --exclude=web/.env.local api web ecosystem.config.js scripts hetzner.md`,
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
          const w = sftp.createWriteStream("/opt/turkexpatlar/hetzner-deploy.tar.gz");
          w.on("close", resolve);
          w.on("error", reject);
          r.pipe(w);
        });
      });
      await exec(
        conn,
        "cd /opt/turkexpatlar && tar xzf hetzner-deploy.tar.gz && rm hetzner-deploy.tar.gz && sed -i 's/\\r$//' scripts/hetzner-*.sh && chmod +x scripts/hetzner-*.sh",
        "Güncelleme",
      );
      const { apiEnv, webEnv } = productionEnv(ROOT);
      await exec(
        conn,
        `cat > /opt/turkexpatlar/api/.env << 'EOF'\n${apiEnv}\nEOF\n cat > /opt/turkexpatlar/web/.env.local << 'EOF'\n${webEnv}\nEOF`,
        ".env dosyaları",
      );
      await exec(conn, "cd /opt/turkexpatlar && bash scripts/hetzner-deploy.sh", "Build + PM2");
      await exec(
        conn,
        "DOMAIN=turkexpatlar.de bash /opt/turkexpatlar/scripts/hetzner-nginx.sh",
        "Nginx",
      );
      await exec(
        conn,
        "pm2 list && curl -s -o /dev/null -w 'API:%{http_code} ' http://127.0.0.1:3201/api/site-settings/public && curl -s -o /dev/null -w 'WEB:%{http_code}' http://127.0.0.1:3200/",
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
  .connect({ host: "159.69.23.193", port: 22, username: "root", password: PASS });
