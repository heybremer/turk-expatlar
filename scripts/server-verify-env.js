const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
if (!process.env.SSH_HOST || !process.env.SSH_USER || !pass) {
  console.error("SSH_HOST, SSH_USER ve SSH_PASS ortam değişkenleri gerekli.");
  process.exit(1);
}
const script = `
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
head -6 ~/turkexpatlar/api/.env
cd ~/turkexpatlar/api
node scripts/test-redis.js 2>/dev/null || node -e "
require('dotenv').config();
const Redis = require('ioredis');
const r = new Redis(process.env.REDIS_URL, { tls: { rejectUnauthorized: false }, connectTimeout: 8000 });
r.ping().then(p => { console.log('REDIS_OK', p); r.disconnect(); }).catch(e => console.log('REDIS_ERR', e.message));
"
`;
const c = new Client();
c.on("ready", () => {
  c.exec(script, (e, s) => {
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
