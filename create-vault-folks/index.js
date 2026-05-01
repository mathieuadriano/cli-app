#!/usr/bin/env node

import * as p from "@clack/prompts";
import degit from "degit";
import { execSync, spawn } from "child_process";
import { existsSync, writeFileSync, readFileSync, createWriteStream } from "fs";
import { tmpdir } from "os";
import { resolve, join } from "path";

const REPO = "mathieuadriano/cli-app";

const THEMES = [
  { name: "dark",   desc: "deep dark background, emerald accent"  },
  { name: "light",  desc: "clean white background, emerald accent" },
  { name: "gray",   desc: "neutral zinc background, indigo accent" },
  { name: "ocean",  desc: "midnight blue background, sky accent"   },
  { name: "purple", desc: "deep purple background, violet accent"  },
];
const VALID_THEMES = THEMES.map((t) => t.name);

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try { execSync(`${cmd} "${url}"`, { stdio: "ignore" }); } catch {}
}

// ── Parse CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const nameArg      = args.find((a) => !a.startsWith("--"));
const vaultIdx     = args.indexOf("--vault-address");
const vaultArg     = vaultIdx !== -1 ? args[vaultIdx + 1] : null;
const vaultNameIdx = args.indexOf("--vault-name");
const vaultNameArg = vaultNameIdx !== -1 ? args[vaultNameIdx + 1] : null;
const themeIdx     = args.indexOf("--theme");
const themeArg     = themeIdx !== -1 ? args[themeIdx + 1] : null;

// Flag validation (fast-fail before any UI)
if (vaultArg && !/^0x[0-9a-fA-F]{40}$/.test(vaultArg)) {
  p.cancel(`"${vaultArg}" is not a valid Ethereum address.`);
  process.exit(1);
}
if (themeArg && !VALID_THEMES.includes(themeArg)) {
  p.cancel(`"${themeArg}" is not a valid theme. Choose: ${VALID_THEMES.join(", ")}.`);
  process.exit(1);
}

// Git check
try {
  execSync("git --version", { stdio: "ignore" });
} catch {
  p.cancel("git is not installed. Visit https://git-scm.com to install it.");
  process.exit(1);
}

// ── Intro ──────────────────────────────────────────────────────────────────────
p.intro(" 🏦 create-vault-folks ");

// ── Gather answers upfront ────────────────────────────────────────────────────
const projectName = nameArg || await p.text({
  message: "📁 Project name",
  placeholder: "my-vault-app",
  validate: (v) => {
    if (!v.trim()) return "Project name is required.";
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return "Only letters, numbers, hyphens and underscores allowed.";
    if (existsSync(resolve(process.cwd(), v))) return `"${v}" already exists.`;
  },
});
if (p.isCancel(projectName)) { p.cancel("Cancelled."); process.exit(0); }

const target = resolve(process.cwd(), projectName);

const vaultName = vaultNameArg || await p.text({
  message: "🏷️  Vault name",
  placeholder: "My Vault (leave blank to skip)",
});
if (p.isCancel(vaultName)) { p.cancel("Cancelled."); process.exit(0); }

const vaultAddress = vaultArg || await p.text({
  message: "🔐 Vault address",
  placeholder: "0x… (leave blank to skip)",
  initialValue: "0xb576765fB15505433aF24FEe2c0325895C559FB2",
  validate: (v) => v && !/^0x[0-9a-fA-F]{40}$/.test(v) ? "Not a valid Ethereum address." : undefined,
});
if (p.isCancel(vaultAddress)) { p.cancel("Cancelled."); process.exit(0); }

const theme = themeArg || await p.select({
  message: "🎨 Color theme",
  options: THEMES.map((t) => ({ value: t.name, label: t.name, hint: t.desc })),
});
if (p.isCancel(theme)) { p.cancel("Cancelled."); process.exit(0); }

const remote = await p.text({
  message: "🐙 GitHub remote URL",
  placeholder: "https://github.com/you/my-app.git (leave blank to skip)",
});
if (p.isCancel(remote)) { p.cancel("Cancelled."); process.exit(0); }

const deployToVercel = remote ? await p.confirm({ message: "▲ Deploy to Vercel?" }) : false;
if (p.isCancel(deployToVercel)) { p.cancel("Cancelled."); process.exit(0); }

// ── Download template ─────────────────────────────────────────────────────────
const spinner = p.spinner();

spinner.start("📦 Downloading template…");
await degit(REPO, { cache: false, force: true }).clone(target).catch((err) => {
  spinner.stop("❌ Download failed.");
  p.cancel(err.message);
  process.exit(1);
});
spinner.stop("✅ Template downloaded.");

// ── Apply vault name / address ────────────────────────────────────────────────
if (vaultName || vaultAddress) {
  let env = "";
  if (vaultName)    env += `NEXT_PUBLIC_VAULT_NAME=${vaultName}\n`;
  if (vaultAddress) env += `NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}\n`;
  writeFileSync(resolve(target, ".env.local"), env);
}

// ── Apply theme ───────────────────────────────────────────────────────────────
if (theme !== "dark") {
  const layoutPath = join(target, "app", "layout.tsx");
  writeFileSync(layoutPath, readFileSync(layoutPath, "utf8").replace('data-theme="dark"', `data-theme="${theme}"`));
}

// ── Install dependencies ──────────────────────────────────────────────────────
spinner.start("📥 Installing dependencies…");
try {
  execSync("npm install", { cwd: target, stdio: "pipe" });
  spinner.stop("✅ Dependencies installed.");
} catch (err) {
  spinner.stop("❌ Installation failed.");
  p.log.error(err.stderr?.toString().trim() || err.message);
  process.exit(1);
}

// ── Git setup ─────────────────────────────────────────────────────────────────
spinner.start("🔧 Initializing git repository…");
execSync("git init", { cwd: target, stdio: "ignore" });
// Ensure author identity is set locally so commit works even without global git config
execSync('git config user.email "scaffold@create-vault-folks"', { cwd: target, stdio: "ignore" });
execSync('git config user.name "create-vault-folks"', { cwd: target, stdio: "ignore" });
spinner.message("🔧 Staging files…");
execSync("git add -A", { cwd: target, stdio: "ignore" });
spinner.message("🔧 Creating initial commit…");
execSync(`git commit -m "Initial commit from create-vault-folks"`, { cwd: target, stdio: "ignore" });
spinner.stop("✅ Git repository initialized.");

// ── Push to GitHub ────────────────────────────────────────────────────────────
let pushedToGitHub = false;

if (remote) {
  spinner.start("🐙 Pushing to GitHub…");
  try {
    execSync(`git remote add origin ${remote}`, { cwd: target, stdio: "ignore" });
    execSync("git push -u origin HEAD", { cwd: target, stdio: "pipe" });
    pushedToGitHub = true;
    spinner.stop("✅ Code pushed to GitHub.");
  } catch (err) {
    spinner.stop("❌ Push failed.");
    p.log.warn(err.stderr?.toString().trim() || err.message);
    p.log.info("Run manually: git remote add origin <url> && git push -u origin HEAD");
  }
}

// ── Vercel deploy ─────────────────────────────────────────────────────────────
let deployedToVercel = false;

if (deployToVercel) {
  try {
    execSync("vercel --version", { stdio: "ignore" });
  } catch {
    spinner.start("▲ Installing Vercel CLI…");
    execSync("npm install -g vercel", { stdio: "pipe" });
    spinner.stop("✅ Vercel CLI installed.");
  }

  p.log.info("▲ A browser window will open to authenticate with Vercel if needed.");

  try { execSync("git remote remove origin", { cwd: target, stdio: "ignore" }); } catch {}

  const vercelLog = join(tmpdir(), `vercel-${Date.now()}.log`);
  const logStream = createWriteStream(vercelLog);
  const sep = "─".repeat(54);
  const buildFrames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let frameIdx = 0;
  let buildTimer = null;

  const startBuild = () => {
    buildTimer = setInterval(() => {
      process.stdout.write(`\r  ${buildFrames[frameIdx++ % buildFrames.length]} Building on Vercel…`);
    }, 80);
  };
  const stopBuild = (msg) => {
    if (!buildTimer) return;
    clearInterval(buildTimer);
    buildTimer = null;
    process.stdout.write(`\r  ✅ ${msg}                    \n`);
  };

  console.log(`\n  \x1b[2m${sep}\x1b[0m`);

  const vercelArgs = ["--yes"];
  if (vaultName)    vercelArgs.push("--env", `NEXT_PUBLIC_VAULT_NAME=${vaultName}`);
  if (vaultAddress) vercelArgs.push("--env", `NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`);

  const proc = spawn("vercel", vercelArgs, { cwd: target, stdio: ["inherit", "pipe", "pipe"] });

  let buf = "";
  const handleChunk = (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const raw of lines) {
      // Take the last \r-separated segment (Vercel overwrites lines in TTY mode)
      const segs = raw.split("\r").map((s) => s.trim()).filter(Boolean);
      const line = segs[segs.length - 1] ?? "";
      if (!line) continue;
      logStream.write(line + "\n");

      // Production URL signals build is about to start — print it then spin
      if (line.startsWith("Production:") || (line.includes(".vercel.app") && !line.includes("go to"))) {
        const clean = line.replace(/Building|Completing/g, "").trim();
        if (clean) process.stdout.write(`  ${clean}\n`);
        if (!buildTimer) startBuild();
        continue;
      }

      // Build is done
      if (line.includes("Deployed to production")) {
        stopBuild("Deployed to production! 🚀");
        process.stdout.write(`  ${line}\n`);
        continue;
      }

      // Suppress raw Building/Completing lines — spinner covers them
      if (/Building|Completing/.test(line)) {
        if (!buildTimer) startBuild();
        continue;
      }

      // All other lines: only print when not currently spinning
      if (!buildTimer) process.stdout.write(`  ${line}\n`);
    }
  };
  proc.stdout.on("data", handleChunk);
  proc.stderr.on("data", handleChunk);

  deployedToVercel = await new Promise((resolve) => {
    proc.on("close", (code) => {
      if (buf.trim()) { logStream.write(buf + "\n"); process.stdout.write(`  ${buf.trim()}\n`); }
      stopBuild("Build complete.");
      logStream.end();
      resolve(code === 0);
    });
  });

  if (!deployedToVercel) p.log.error("❌ Deploy failed — run vercel inside the project manually.");

  console.log(`\n  \x1b[2m${sep}\x1b[0m\n`);

  if (deployedToVercel) p.log.success("🚀 Project deployed on Vercel!");

  // Persist env vars in Vercel project settings so GitHub-triggered builds also pick them up
  if (deployedToVercel && (vaultName || vaultAddress)) {
    spinner.start("🔑 Persisting env vars in Vercel…");
    try {
      if (vaultName)    execSync("vercel env add NEXT_PUBLIC_VAULT_NAME production", { cwd: target, input: vaultName,    stdio: ["pipe", "ignore", "ignore"] });
      if (vaultAddress) execSync("vercel env add NEXT_PUBLIC_VAULT_ADDRESS production", { cwd: target, input: vaultAddress, stdio: ["pipe", "ignore", "ignore"] });
      spinner.stop("✅ Env vars saved to Vercel project.");
    } catch {
      spinner.stop("⚠️  Could not persist env vars — add them manually in Vercel project settings.");
    }
  }

  if (remote) {
    try { execSync(`git remote add origin ${remote}`, { cwd: target, stdio: "ignore" }); } catch {}
  }

  if (deployedToVercel) {
    const out = existsSync(vercelLog) ? readFileSync(vercelLog, "utf8") : "";
    const match = out.match(/Linked to ([^/\s]+)\/([^(\s\n]+)/);
    const settingsUrl = match
      ? `https://vercel.com/${match[1]}/${match[2]}/settings/git`
      : "https://vercel.com";

    const connectGit = await p.confirm({ message: "🔗 Connect your GitHub repo to this Vercel deployment?" });
    if (!p.isCancel(connectGit) && connectGit) {
      openBrowser(settingsUrl);
      p.log.success(settingsUrl);
    }
  }
}

// ── Recap ─────────────────────────────────────────────────────────────────────
const recapLines = [
  `📁 ${projectName} cloned on your machine`,
  vaultName          && `🏷️  Vault name: ${vaultName}`,
  vaultAddress       && `🔐 Vault address: ${vaultAddress}`,
  `🎨 Theme: ${theme}`,
  pushedToGitHub     && `🐙 Code pushed to GitHub (${remote})`,
  deployedToVercel   && `🚀 Project deployed on Vercel`,
  pushedToGitHub && deployedToVercel && `⚡ Every push to GitHub triggers a new Vercel deployment`,
  deployedToVercel   && `🌐 Add a custom domain in your Vercel project settings`,
].filter(Boolean).join("\n");

p.note(recapLines, "🎉 Summary");

p.outro(`🛠️  Start building  →  cd ${projectName} && npm run dev`);
