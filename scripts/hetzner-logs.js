const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec(
    "pm2 logs turkexpatlar-api --lines 80 --nostream 2>&1 | tail -80",
    (err, stream) => {
      stream.on("data", (d) => process.stdout.write(d));
      stream.on("close", () => conn.end());
    },
  );
}).connect({
  host: "159.69.23.193",
  username: "root",
  password: process.env.HETZNER_PASS,
});
