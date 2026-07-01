const { Client } = require("ssh2");
const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      "certbot --nginx -d turkexpatlar.de -d www.turkexpatlar.de -d api.turkexpatlar.de --non-interactive --agree-tos -m admin@turkexpatlar.de",
      (err, stream) => {
        stream.on("data", (d) => process.stdout.write(d));
        stream.stderr.on("data", (d) => process.stderr.write(d));
        stream.on("close", (code) => {
          if (code === 0) {
            conn.exec(
              "curl -s -o /dev/null -w 'HTTPS-web:%{http_code} ' https://turkexpatlar.de/ && curl -s -o /dev/null -w 'HTTPS-api:%{http_code}' https://api.turkexpatlar.de/api/site-settings/public",
              (e2, s2) => {
                s2.on("data", (d) => process.stdout.write(d));
                s2.on("close", () => conn.end());
              },
            );
          } else {
            conn.end();
            process.exit(code);
          }
        });
      },
    );
  })
  .connect({
    host: "159.69.23.193",
    username: "root",
    password: process.env.HETZNER_PASS,
  });
