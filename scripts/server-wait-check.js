const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
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
  host: "access-5020523952.webspace-host.com",
  port: 22,
  username: "su1182926",
  password: pass,
});
