/**
 * Yerel projeyi IONOS Webspace sunucusuna yükler.
 * Kullanım: set SSH_PASS=... && node scripts/deploy-to-webspace.js
 */
const { Client } = require("ssh2");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TAR = path.join(ROOT, "deploy.tar.gz");
const host = process.env.SSH_HOST || "access-5020523952.webspace-host.com";
const user = process.env.SSH_USER || "su1182926";
const pass = process.env.SSH_PASS;
const remoteDir = process.env.APP_DIR || "turkexpatlar";

if (!pass) {
  console.error("SSH_PASS gerekli");
  process.exit(1);
}

console.log("==> Paket oluşturuluyor...");
if (fs.existsSync(TAR)) fs.unlinkSync(TAR);

execSync(
  `tar -czf "${TAR}" --exclude=node_modules --exclude=.next --exclude=dist --exclude=.git --exclude=deploy.tar.gz api web ecosystem.config.js scripts`,
  { cwd: ROOT, stdio: "inherit", shell: true },
);

const conn = new Client();

conn.on("ready", () => {
  console.log("==> Sunucuya yükleniyor...");
  conn.sftp((err, sftp) => {
    if (err) throw err;

    conn.exec(`mkdir -p ~/${remoteDir}`, () => {
      const remoteTar = `/${remoteDir}/deploy.tar.gz`.replace(/^\//, `home/www/${remoteDir}/deploy.tar.gz`);
      // SFTP path from home
      const remotePath = `deploy.tar.gz`;

      const read = fs.createReadStream(TAR);
      const write = sftp.createWriteStream(`${remoteDir}/deploy.tar.gz`);

      write.on("close", () => {
        console.log("==> Sunucuda açılıyor ve kuruluyor...");
        const setup = [
          `cd ~/${remoteDir}`,
          "tar xzf deploy.tar.gz",
          "rm deploy.tar.gz",
          "mkdir -p logs",
          "cd api && npm ci 2>&1 | tail -3",
          "cd ../web && npm ci --legacy-peer-deps 2>&1 | tail -3",
          "echo 'UPLOAD_OK'",
        ].join(" && ");

        conn.exec(setup, (e, stream) => {
          stream.on("data", (d) => process.stdout.write(d));
          stream.stderr.on("data", (d) => process.stderr.write(d));
          stream.on("close", () => {
            fs.unlinkSync(TAR);
            conn.end();
            console.log("==> Yükleme tamamlandı.");
          });
        });
      });

      read.pipe(write);
    });
  });
}).on("error", (e) => {
  console.error("SSH:", e.message);
  process.exit(1);
}).connect({ host, port: 22, username: user, password: pass });
