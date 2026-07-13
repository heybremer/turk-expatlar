const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;

const required = [
  "SSH_HOST",
  "SSH_USER",
  "SSH_PASS",
  "UPSTASH_TOKEN",
  "UPSTASH_HOST",
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Eksik ortam değişkenleri: ${missing.join(", ")}`);
  process.exit(1);
}

const redisUrl = `rediss://default:${process.env.UPSTASH_TOKEN}@${process.env.UPSTASH_HOST}:6379`;

const setupEnv = `
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20

DOMAIN="https://turkexpatlar.de"
API_URL="https://turkexpatlar.de"

cat > ~/turkexpatlar/api/.env << 'ENVEOF'
NODE_ENV=production
PORT=3201
DATABASE_URL=PLACEHOLDER_DATABASE_URL
REDIS_URL=${redisUrl.replace(/'/g, "")}
JWT_SECRET=${process.env.JWT_SECRET}
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://turkexpatlar.de
WEB_URL=https://turkexpatlar.de
SITE_URL=https://turkexpatlar.de
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ENVEOF

cat > ~/turkexpatlar/web/.env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://turkexpatlar.de
JWT_SECRET=${process.env.JWT_SECRET}
NEXT_PUBLIC_SUPABASE_URL=${process.env.SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${process.env.SUPABASE_PUBLISHABLE_KEY}
ENVEOF

echo "==> .env dosyalari olusturuldu"
node -e "
const Redis = require('ioredis');
const u = process.env.REDIS_URL || '${redisUrl.replace(/'/g, "")}';
const r = new Redis(u, { tls: { rejectUnauthorized: false }, maxRetriesPerRequest: 1, connectTimeout: 8000 });
r.ping().then(p => { console.log('REDIS_PING:', p); r.disconnect(); }).catch(e => { console.log('REDIS_FAIL:', e.message); process.exit(1); });
" 2>&1 || echo REDIS_TEST_NODE_FAIL
`;

const c = new Client();
c.on("ready", () => {
  c.exec(setupEnv, (e, s) => {
    s.on("data", (d) => process.stdout.write(d));
    s.stderr.on("data", (d) => process.stderr.write(d));
    s.on("close", () => c.end());
  });
}).connect({
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: pass,
});
