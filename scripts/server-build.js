const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
const cmd = [
  "cd ~/turkexpatlar/api && npm run build 2>&1 | tail -15",
  "echo '---WEB---'",
  "cd ~/turkexpatlar/web && npm run build 2>&1 | tail -15",
].join("; ");

const c = new Client();
c.on("ready", () => {
  c.exec(cmd, (e, s) => {
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
