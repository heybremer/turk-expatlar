const { Client } = require("ssh2");

const OLD = process.env.HETZNER_PASS;
const NEW = process.env.HETZNER_PASS_NEW || "TurkExpatlarHetzner2026!";

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const conn = new Client();
conn
  .on("ready", () => {
    conn.shell((err, stream) => {
      if (err) throw err;
      let buf = "";
      stream.on("data", (d) => {
        const s = d.toString();
        process.stdout.write(s);
        buf += s;
      });

      (async () => {
        await delay(1500);
        stream.write(`${NEW}\n`);
        await delay(1500);
        stream.write(`${NEW}\n`);
        await delay(3000);
        stream.write("echo PASSWD_DONE\n");
        await delay(2000);
        conn.end();
      })();
    });
  })
  .connect({
    host: "159.69.23.193",
    port: 22,
    username: "root",
    password: OLD,
  });
