const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;

const redisUrl = `rediss://default:${process.env.UPSTASH_TOKEN}@modest-weevil-125875.upstash.io:6379`;

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
JWT_SECRET=turkexpatlar-prod-jwt-change-after-launch-2026
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
JWT_SECRET=turkexpatlar-prod-jwt-change-after-launch-2026
NEXT_PUBLIC_SUPABASE_URL=https://puixogwequambqxjhzja.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ToyLTRHfaqXs-SGGVwjeyw_58QjOhrj
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
  host: "access-5020523952.webspace-host.com",
  port: 22,
  username: "su1182926",
  password: pass,
});
