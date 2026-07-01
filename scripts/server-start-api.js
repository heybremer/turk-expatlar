const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
const script = `
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
cd ~/turkexpatlar/api
test -f dist/src/main.js && echo "main.js OK" || (npm run build && echo "rebuilt")
cd ~/turkexpatlar
sed -i "s|dist/main.js|dist/src/main.js|g" ecosystem.config.js 2>/dev/null || true
npx pm2 delete turkexpatlar-api 2>/dev/null || true
npx pm2 start ecosystem.config.js --only turkexpatlar-api --env production
npx pm2 list
`;
const c = new Client();
c.on("ready", () => {
  c.exec(script, (e, s) => {
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
