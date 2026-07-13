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

test -f ~/turkexpatlar/api/dist/main.js && echo "API dist OK: $(ls -la ~/turkexpatlar/api/dist/main.js)"

cd ~/turkexpatlar/web
echo "==> WEB npm install..."
npm install --legacy-peer-deps --no-audit 2>&1 | tail -3

echo "==> WEB build..."
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build 2>&1 | tail -30
test -d .next && echo WEB_BUILD_OK
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
