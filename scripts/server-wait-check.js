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
sleep 15
cd ~/turkexpatlar
npx pm2 list
tail -30 ~/turkexpatlar/api/logs/api-out-0.log 2>/dev/null
tail -15 ~/turkexpatlar/api/logs/api-error-0.log 2>/dev/null
ss -tlnp 2>/dev/null | grep -E '3201|node' || true
curl -s -m 10 -w "\\nHTTP:%{http_code}" http://127.0.0.1:3201/api/site-settings/public | tail -c 400
echo ""
`;
const c = new Client();
c.on("ready", () => {
  c.exec(script, (e, s) => {
    s.on("data", (d) => process.stdout.write(d));
    s.on("close", () => c.end());
  });
}).connect({
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: pass,
});
