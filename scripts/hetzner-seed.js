/**
 * Production veritabanına eyalet/şehir seed (PLZ lookup için gerekli)
 */
const { Client } = require("ssh2");

const PASS = process.env.HETZNER_PASS;

function exec(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`${label} failed (${code})`));
        else resolve();
      });
    });
  });
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      await exec(
        conn,
        "cd /opt/turkexpatlar/api && npx prisma db seed",
        "Prisma seed",
      );
      await exec(
        conn,
        "curl -s https://api.turkexpatlar.de/api/locations/states | head -c 200; echo; curl -s https://api.turkexpatlar.de/api/locations/postal/28832",
        "Kontrol",
      );
    } catch (e) {
      console.error("\nHATA:", e.message);
      process.exitCode = 1;
    } finally {
      conn.end();
    }
  })
  .connect({ host: "159.69.23.193", port: 22, username: "root", password: PASS });
