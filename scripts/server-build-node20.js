const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;

const script = `
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20

# .bashrc kalıcı nvm
if ! grep -q NVM_DIR ~/.bashrc 2>/dev/null; then
  echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
  echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.bashrc
  echo "==> .bashrc güncellendi"
fi

echo "==> API: npm install..."
cd ~/turkexpatlar/api
npm install --legacy-peer-deps --no-audit 2>&1 | tail -5

echo "==> API: build..."
npm run build 2>&1 | tail -8

echo "==> WEB: npm install..."
cd ~/turkexpatlar/web
npm install --legacy-peer-deps --no-audit 2>&1 | tail -5

echo "==> WEB: build (uzun sürebilir)..."
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build 2>&1 | tail -15

echo "==> BUILD_DONE"
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
  host: "access-5020523952.webspace-host.com",
  port: 22,
  username: "su1182926",
  password: pass,
});
