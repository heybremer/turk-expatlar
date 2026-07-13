const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
if (!process.env.SSH_HOST || !process.env.SSH_USER || !pass) {
  console.error("SSH_HOST, SSH_USER ve SSH_PASS ortam değişkenleri gerekli.");
  process.exit(1);
}
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
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: pass,
});
