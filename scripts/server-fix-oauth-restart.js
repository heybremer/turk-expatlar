const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
const script = `
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"

cd ~/turkexpatlar/api
sed -i 's/^GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=DISABLED/' .env
sed -i 's/^GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=DISABLED/' .env

cd ~/turkexpatlar
sed -i "s/instances: 'max'/instances: 1/" ecosystem.config.js
sed -i "s/exec_mode: 'cluster'/exec_mode: 'fork'/" ecosystem.config.js

npx pm2 delete all 2>/dev/null || true
npx pm2 start ecosystem.config.js --only turkexpatlar-api --env production
sleep 6
npx pm2 list
curl -s -m 10 http://127.0.0.1:3201/api/site-settings/public | head -c 500
echo ""
curl -s -m 5 -o /dev/null -w "HTTP:%{http_code}" http://127.0.0.1:3201/api/site-settings/public
echo ""
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
