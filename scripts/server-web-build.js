const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
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
  host: "access-5020523952.webspace-host.com",
  port: 22,
  username: "su1182926",
  password: pass,
});
