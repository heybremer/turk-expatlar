const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;

const script = `
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"

echo "==> uname -m: $(uname -m)"
nvm uninstall 20 --force 2>/dev/null || true
rm -rf ~/.nvm/versions/node/v20.20.2 2>/dev/null || true

export NVM_NODEJS_ORG_ARCH=x64
echo "==> Node 20 x64 kuruluyor..."
nvm install 20
nvm alias default 20
nvm use 20

echo "==> node -v: $(node -v)"
echo "==> file node: $(file $(which node) 2>/dev/null || echo skip)"
node -e "console.log('node OK', process.arch)"

echo "==> API build..."
cd ~/turkexpatlar/api
npm install --legacy-peer-deps --no-audit 2>&1 | tail -3
npm run build 2>&1 | tail -5
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
