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
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: pass,
});
