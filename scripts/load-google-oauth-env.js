/**
 * google-oauth.env dosyasını okur (proje kökünde, gitignore'da).
 * Örnek: scripts/google-oauth.env.example
 */
const fs = require("fs");
const path = require("path");

function loadGoogleOAuthEnv(rootDir) {
  const root = rootDir || path.resolve(__dirname, "..");
  const fromEnv = {
    id: process.env.GOOGLE_CLIENT_ID?.trim(),
    secret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
  };

  const file = path.join(root, "google-oauth.env");
  if (!fs.existsSync(file)) {
    return {
      id: fromEnv.id || "DISABLED",
      secret: fromEnv.secret || "DISABLED",
    };
  }

  const vars = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }

  return {
    id: vars.GOOGLE_CLIENT_ID || fromEnv.id || "DISABLED",
    secret: vars.GOOGLE_CLIENT_SECRET || fromEnv.secret || "DISABLED",
  };
}

module.exports = { loadGoogleOAuthEnv };
