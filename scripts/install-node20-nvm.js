const { Client } = require("ssh2");
const pass = process.env.SSH_PASS;
if (!pass) {
  console.error("SSH_PASS gerekli");
  process.exit(1);
}

const installScript = `
set -e
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "==> NVM kuruluyor..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
. "$NVM_DIR/nvm.sh"
echo "==> NVM: $(nvm --version 2>/dev/null || echo yok)"
echo "==> Node 20 kuruluyor..."
nvm install 20
nvm alias default 20
nvm use 20
echo "==> Node: $(node -v)"
echo "==> npm: $(npm -v)"
echo "==> which node: $(which node)"
`;

const conn = new Client();
conn
  .on("ready", () => {
    console.log("SSH bağlantısı OK\n");
    conn.exec(installScript, (err, stream) => {
      if (err) {
        console.error(err);
        conn.end();
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        console.log("\n==> Exit code:", code);
        conn.end();
        process.exit(code || 0);
      });
    });
  })
  .on("error", (e) => {
    console.error("SSH hata:", e.message);
    process.exit(1);
  })
  .connect({
    host: process.env.SSH_HOST || "access-5020523952.webspace-host.com",
    port: 22,
    username: process.env.SSH_USER || "su1182926",
    password: pass,
  });
