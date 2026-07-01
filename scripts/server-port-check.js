const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
const script = `
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd ~/turkexpatlar
npx pm2 list
grep -i "running\|started\|listen\|error" ~/turkexpatlar/api/logs/api-out-0.log 2>/dev/null | tail -5
grep -i "error\|panic" ~/turkexpatlar/api/logs/api-error-0.log 2>/dev/null | tail -5
ss -tlnp 2>/dev/null | grep 3201 || netstat -tlnp 2>/dev/null | grep 3201 || echo "no 3201 listener"
curl -v -m 5 http://127.0.0.1:3201/api/site-settings/public 2>&1 | tail -15
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
