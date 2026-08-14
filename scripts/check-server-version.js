const { Client } = require("ssh2");
const PASS = process.env.HETZNER_PASS || "TurkExpatlarHetzner2026!";

const conn = new Client();
conn
  .on("ready", () => {
    const cmd = [
      "echo '=== GIT ==='",
      "cd /opt/turkexpatlar && git rev-parse HEAD 2>/dev/null || echo 'git yok'",
      "cd /opt/turkexpatlar && git log -1 --oneline 2>/dev/null || true",
      "cd /opt/turkexpatlar && git branch --show-current 2>/dev/null || true",
      "echo '=== BUILD ==='",
      "test -f /opt/turkexpatlar/web/.next/BUILD_ID && cat /opt/turkexpatlar/web/.next/BUILD_ID || echo 'build id yok'",
      "echo '=== PM2 ==='",
      "pm2 list 2>/dev/null | tail -5",
      "echo '=== DOSYA KONTROL (main ozellikleri) ==='",
      "test -f /opt/turkexpatlar/api/src/tasks/forum-reply-bot.service.ts && echo 'forum-reply-bot: VAR' || echo 'forum-reply-bot: YOK'",
      "test -f /opt/turkexpatlar/api/src/telsiz/telsiz.gateway.ts && echo 'telsiz: VAR' || echo 'telsiz: YOK'",
      "grep -l 'replyTo' /opt/turkexpatlar/web/src/app/sohbet/*/\\[slug\\]/page.tsx 2>/dev/null | head -1 && echo 'sohbet-yanit: VAR' || echo 'sohbet-yanit: kontrol edilemedi'",
      "test -f /opt/turkexpatlar/api/src/admin/audit-log.service.ts && echo 'audit-log: VAR' || echo 'audit-log: YOK'",
      "test -f /opt/turkexpatlar/web/src/lib/site-layout.ts && echo 'site-layout: VAR' || echo 'site-layout: YOK'",
      "echo '=== SON MIGRATIONS ==='",
      "ls /opt/turkexpatlar/api/prisma/migrations 2>/dev/null | tail -6",
      "echo '=== BUILD TARIH ==='",
      "stat -c '%y %n' /opt/turkexpatlar/api/dist/main.js 2>/dev/null",
      "stat -c '%y %n' /opt/turkexpatlar/web/.next/BUILD_ID 2>/dev/null",
    ].join("; ");
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", () => conn.end());
    });
  })
  .on("error", (e) => {
    console.error("SSH_FAIL:", e.message);
    process.exit(1);
  })
  .connect({ host: "159.69.23.193", port: 22, username: "root", password: PASS });
