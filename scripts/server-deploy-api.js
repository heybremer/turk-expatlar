const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
const dbUrl = process.env.DATABASE_URL;

if (!pass || !dbUrl) {
  console.error("SSH_PASS and DATABASE_URL required");
  process.exit(1);
}

// Escape for sed
const escaped = dbUrl.replace(/'/g, "'\\''");

const script = `
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20

cd ~/turkexpatlar/api

# DATABASE_URL güncelle
sed -i "s|^DATABASE_URL=.*|DATABASE_URL='${escaped}'|" .env
echo "==> DATABASE_URL güncellendi"

echo "==> Prisma migrate..."
npx prisma migrate deploy 2>&1 | tail -20

echo "==> PM2 API başlat..."
cd ~/turkexpatlar
npx pm2 delete turkexpatlar-api 2>/dev/null || true
npx pm2 start ecosystem.config.js --only turkexpatlar-api --env production
npx pm2 save 2>/dev/null || true
sleep 2
npx pm2 list
curl -s -o /dev/null -w "API_HTTP:%{http_code}" http://127.0.0.1:3201/api/site-settings/public 2>/dev/null || echo API_CURL_FAIL
echo ""
`;

const c = new Client();
c.on("ready", () => {
  console.log("SSH OK\n");
  c.exec(script, (e, s) => {
    s.on("data", (d) => process.stdout.write(d));
    s.stderr.on("data", (d) => process.stderr.write(d));
    s.on("close", (code) => {
      console.log("\nExit:", code);
      c.end();
    });
  });
}).on("error", (e) => {
  console.error(e.message);
  process.exit(1);
}).connect({
  host: "access-5020523952.webspace-host.com",
  port: 22,
  username: "su1182926",
  password: pass,
});
