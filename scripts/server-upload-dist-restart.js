const { Client } = require("ssh2");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const pass = process.env.SSH_PASS;
const ROOT = path.resolve(__dirname, "..");
const TAR = path.join(ROOT, "api-dist.tar.gz");

execSync(`tar -czf "${TAR}" -C api dist`, { shell: true });

const c = new Client();
c.on("ready", () => {
  c.sftp((err, sftp) => {
    const r = fs.createReadStream(TAR);
    const w = sftp.createWriteStream("turkexpatlar/api-dist.tar.gz");
    w.on("close", () => {
      const script = `
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd ~/turkexpatlar/api
rm -rf dist
tar xzf ../api-dist.tar.gz
rm ../api-dist.tar.gz
grep GOOGLE .env
cd ~/turkexpatlar
npx pm2 delete all 2>/dev/null || true
npx pm2 start ecosystem.config.js --only turkexpatlar-api --env production
sleep 8
npx pm2 list
ss -tlnp 2>/dev/null | grep 3201 || echo no_listener
curl -s -m 10 -w " HTTP:%{http_code}" http://127.0.0.1:3201/api/site-settings/public | tail -c 300
echo ""
`;
      c.exec(script, (e, s) => {
        s.on("data", (d) => process.stdout.write(d));
        s.stderr.on("data", (d) => process.stderr.write(d));
        s.on("close", () => {
          fs.unlinkSync(TAR);
          c.end();
        });
      });
    });
    r.pipe(w);
  });
}).connect({
  host: "access-5020523952.webspace-host.com",
  port: 22,
  username: "su1182926",
  password: pass,
});
