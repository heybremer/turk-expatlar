const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
if (!process.env.SSH_HOST || !process.env.SSH_USER || !pass) {
  console.error("SSH_HOST, SSH_USER ve SSH_PASS ortam değişkenleri gerekli.");
  process.exit(1);
}

const script = `
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20

echo "==> node $(node -v) $(node -p process.arch)"

echo "==> node_modules temizleniyor..."
rm -rf ~/turkexpatlar/api/node_modules ~/turkexpatlar/web/node_modules
rm -f ~/turkexpatlar/api/package-lock.json ~/turkexpatlar/web/package-lock.json 2>/dev/null || true

echo "==> API install + build..."
cd ~/turkexpatlar/api
npm install --legacy-peer-deps --no-audit
npm run build
ls -la dist/main.js 2>/dev/null && echo API_BUILD_OK

echo "==> WEB install + build..."
cd ~/turkexpatlar/web
npm install --legacy-peer-deps --no-audit
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
test -d .next && echo WEB_BUILD_OK

echo "==> ALL_DONE"
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
