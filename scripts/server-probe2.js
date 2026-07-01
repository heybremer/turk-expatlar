const { Client } = require("ssh2");
const host = process.env.SSH_HOST || "access-5020523952.webspace-host.com";
const user = process.env.SSH_USER || "su1182926";
const pass = process.env.SSH_PASS;
if (!pass) process.exit(1);

const cmd = [
  "ls -la ~/public",
  "df -h ~ 2>/dev/null | tail -1",
  "which psql pm2 2>/dev/null; pm2 -v 2>/dev/null",
  "free -m 2>/dev/null | head -2",
  "cat ~/public/.htaccess 2>/dev/null | head -5",
  "ls -la ~/ 2>/dev/null",
].join("; echo '==='; ");

const conn = new Client();
conn.on("ready", () => {
  conn.exec(cmd, (err, stream) => {
    stream.on("data", (d) => process.stdout.write(d));
    stream.stderr.on("data", (d) => process.stderr.write(d));
    stream.on("close", () => conn.end());
  });
}).on("error", (e) => console.error(e.message)).connect({ host, port: 22, username: user, password: pass });
