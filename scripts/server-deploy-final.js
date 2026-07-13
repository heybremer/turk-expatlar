const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
const dbUrl = process.env.DATABASE_URL;

if (!pass || !dbUrl || !process.env.SSH_HOST || !process.env.SSH_USER) {
  console.error("SSH_HOST, SSH_USER, SSH_PASS ve DATABASE_URL ortam değişkenleri gerekli.");
  process.exit(1);
}

const escaped = dbUrl.replace(/'/g, "'\\''");

const script = `
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"

cd ~/turkexpatlar/api
sed -i "s|^DATABASE_URL=.*|DATABASE_URL='${escaped}'|" .env

cd ~/turkexpatlar
sed -i "s|dist/main.js|dist/src/main.js|g" ecosystem.config.js
grep -q "interpreter:" ecosystem.config.js || sed -i "s|cwd: './api',|cwd: './api',\\n      interpreter: '/home/www/.nvm/versions/node/v20.20.2/bin/node',|" ecosystem.config.js

cd api
test -f dist/src/main.js || npm run build

cd ~/turkexpatlar
npx pm2 delete turkexpatlar-api 2>/dev/null || true
npx pm2 start ecosystem.config.js --only turkexpatlar-api --env production
sleep 4
npx pm2 list
npx pm2 logs turkexpatlar-api --lines 8 --nostream 2>/dev/null || true
curl -s -o /tmp/api-test.json -w "HTTP:%{http_code}" http://127.0.0.1:3201/api/site-settings/public
echo ""
head -c 300 /tmp/api-test.json 2>/dev/null; echo ""
`;

const c = new Client();
c.on("ready", () => {
  c.exec(script, (e, s) => {
    s.on("data", (d) => process.stdout.write(d));
    s.stderr.on("data", (d) => process.stderr.write(d));
    s.on("close", (code) => {
      console.log("\nExit:", code);
      c.end();
    });
  });
}).connect({
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: pass,
});
