const { Client } = require("ssh2");

if (!process.env.HETZNER_HOST || !process.env.HETZNER_PASS) {
  console.error("HETZNER_HOST ve HETZNER_PASS ortam değişkenleri gerekli");
  process.exit(1);
}

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
  host: process.env.HETZNER_HOST,
  username: "root",
  password: process.env.HETZNER_PASS,
});
