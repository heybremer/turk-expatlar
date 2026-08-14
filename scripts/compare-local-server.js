const { Client } = require("ssh2");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

function readPass() {
  if (process.env.HETZNER_PASS) return process.env.HETZNER_PASS;
  const credPath = path.join(ROOT, "hetznersifre.md");
  if (fs.existsSync(credPath)) {
    const m = fs.readFileSync(credPath, "utf8").match(/Password\s+(\S+)/i);
    if (m) return m[1];
  }
  console.error("HETZNER_PASS veya hetznersifre.md gerekli");
  process.exit(1);
}

const PASS = readPass();

const ROOT = path.resolve(__dirname, "..");
const FILES = [
  "web/src/lib/postal-plz.ts",
  "web/src/app/page.tsx",
  "api/src/tasks/forum-reply-bot.service.ts",
  "api/src/telsiz/telsiz.gateway.ts",
  "web/src/app/sohbet/[type]/[slug]/page.tsx",
  "ecosystem.config.js",
];

function md5(filePath, normalizeLf = false) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) return null;
  let buf = fs.readFileSync(full);
  if (normalizeLf) buf = Buffer.from(buf.toString().replace(/\r\n/g, "\n"));
  return crypto.createHash("md5").update(buf).digest("hex");
}

const local = FILES.map((f) => ({ file: f, md5: md5(f), md5Lf: md5(f, true) }));

const remoteCmd = FILES.map((f) => {
  const remote = `/opt/turkexpatlar/${f.replace(/\\/g, "/")}`;
  return `[ -f "${remote}" ] && md5sum "${remote}" || echo "MISSING ${remote}"`;
}).join("; ");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(remoteCmd, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      let out = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.on("close", () => {
        const remoteLines = out.trim().split("\n").filter(Boolean);
        const remoteMap = new Map();
        for (const line of remoteLines) {
          if (line.startsWith("MISSING ")) {
            remoteMap.set(line.replace("MISSING ", ""), null);
            continue;
          }
          const [hash, ...rest] = line.split(/\s+/);
          remoteMap.set(rest.join(" ").trim(), hash);
        }

        console.log("=== YEREL (Windows) vs CANLI SUNUCU ===\n");
        let sameRaw = 0;
        let sameLf = 0;
        let diffContent = 0;
        let missing = 0;

        for (const { file, md5: localMd5, md5Lf: localLf } of local) {
          const remotePath = `/opt/turkexpatlar/${file.replace(/\\/g, "/")}`;
          let remoteMd5 = remoteMap.get(remotePath);
          if (remoteMd5 === undefined) {
            const key = [...remoteMap.keys()].find((k) => k.endsWith(file.replace(/\\/g, "/")));
            remoteMd5 = key ? remoteMap.get(key) : null;
          }
          if (remoteMd5 === null || remoteMd5 === undefined) {
            console.log(`?  ${file} — sunucuda yok`);
            missing++;
            continue;
          }
          if (localMd5 === remoteMd5) {
            console.log(`✓  ${file} (birebir)`);
            sameRaw++;
            sameLf++;
          } else if (localLf === remoteMd5) {
            console.log(`≈  ${file} (içerik aynı, satır sonu CRLF/LF farkı)`);
            sameLf++;
          } else {
            console.log(`✗  ${file}`);
            console.log(`   yerel (LF): ${localLf}`);
            console.log(`   sunucu:     ${remoteMd5}\n`);
            diffContent++;
          }
        }

        console.log("---");
        console.log(`Birebir aynı: ${sameRaw} | İçerik aynı (LF): ${sameLf} | Gerçek fark: ${diffContent} | Yok: ${missing}`);
        console.log(
          diffContent === 0
            ? "\nSonuç: Kaynak dosyalar aynı nesil — Windows'ta sadece satır sonu farkı olabilir."
            : "\nSonuç: Bazı dosyalar gerçekten farklı — deploy gerekebilir.",
        );
        conn.end();
      });
    });
  })
  .on("error", (e) => {
    console.error("SSH hata:", e.message);
    process.exit(1);
  })
  .connect({ host: "159.69.23.193", port: 22, username: "root", password: PASS });
