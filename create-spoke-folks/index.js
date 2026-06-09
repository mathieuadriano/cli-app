#!/usr/bin/env node

import * as p from "@clack/prompts";
import degit from "degit";
import { execSync, spawn } from "child_process";
import { existsSync, writeFileSync, readFileSync, unlinkSync, rmSync, createWriteStream } from "fs";
import { tmpdir } from "os";
import { resolve, join } from "path";

// ── Node.js version guard ─────────────────────────────────────────────────────
const [nodeMajor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 18) {
  console.error(`\n  ✖ Node.js 18 or higher is required (you have v${process.versions.node}).\n  Update at https://nodejs.org\n`);
  process.exit(1);
}

const REPO = "mathieuadriano/cli-app";

const THEMES = [
  { name: "dark",   desc: "deep dark background, emerald accent"  },
  { name: "light",  desc: "clean white background, emerald accent" },
  { name: "gray",   desc: "neutral zinc background, indigo accent" },
  { name: "ocean",  desc: "midnight blue background, sky accent"   },
  { name: "purple", desc: "deep purple background, violet accent"  },
];
const VALID_THEMES = THEMES.map((t) => t.name);

const CHAINS = [
  { name: "EVM",      desc: "Ethereum, Base, Arbitrum, Optimism…" },
  { name: "Algorand", desc: "Algorand blockchain"                  },
  { name: "Solana",   desc: "Solana blockchain"                    },
];
const VALID_CHAINS = CHAINS.map((c) => c.name);

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try { execSync(`${cmd} "${url}"`, { stdio: "ignore" }); } catch {}
}

// ── Parse CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

// --help / -h  (check before any prompts or validation)
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  create-spoke-folks — scaffold a DeFi spoke app in seconds

  Usage
    npx create-spoke-folks@latest [project-name] [flags]

  Flags
    --spoke-name    <name>    Spoke display name
    --spoke-address <addr>    Sault contract address (0x…)
    --chain         <chain>   Chain connector: ${VALID_CHAINS.join(", ")}
    --theme         <theme>   Color theme: ${VALID_THEMES.join(", ")}
    -h, --help                Show this help

  Examples
    npx create-spoke-folks@latest my-app
    npx create-spoke-folks@latest my-app --chain Solana --theme ocean
    npx create-spoke-folks@latest my-app --spoke-address 0xb576765fB15505433aF24FEe2c0325895C559FB2
  `);
  process.exit(0);
}

const nameArg      = args.find((a) => !a.startsWith("--"));
const spokeIdx     = args.indexOf("--spoke-address");
const spokeArg     = spokeIdx !== -1 ? args[spokeIdx + 1] : null;
const spokeNameIdx = args.indexOf("--spoke-name");
const spokeNameArg = spokeNameIdx !== -1 ? args[spokeNameIdx + 1] : null;
const themeIdx     = args.indexOf("--theme");
const themeArg     = themeIdx !== -1 ? args[themeIdx + 1] : null;
const chainIdx     = args.indexOf("--chain");
const chainArg     = chainIdx !== -1 ? args[chainIdx + 1] : null;

// Flag validation (fast-fail before any UI)
if (spokeArg && !/^0x[0-9a-fA-F]{40}$/.test(spokeArg)) {
  p.cancel(`"${spokeArg}" is not a valid Ethereum address.`);
  process.exit(1);
}
if (themeArg && !VALID_THEMES.includes(themeArg)) {
  p.cancel(`"${themeArg}" is not a valid theme. Choose: ${VALID_THEMES.join(", ")}.`);
  process.exit(1);
}
if (chainArg && !VALID_CHAINS.includes(chainArg)) {
  p.cancel(`"${chainArg}" is not a valid chain. Choose: ${VALID_CHAINS.join(", ")}.`);
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
p.intro(" 🏦 create-spoke-folks ");

// ── Gather answers upfront ────────────────────────────────────────────────────
const projectName = nameArg || await p.text({
  message: "📁 Project name",
  placeholder: "my-spoke-app",
  validate: (v) => {
    if (!v.trim()) return "Project name is required.";
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return "Only letters, numbers, hyphens and underscores allowed.";
    if (existsSync(resolve(process.cwd(), v))) return `"${v}" already exists.`;
  },
});
if (p.isCancel(projectName)) { p.cancel("Cancelled."); process.exit(0); }

const target = resolve(process.cwd(), projectName);

// Cleanup helper — deletes target dir on fatal error so the user can retry cleanly
function cleanup() {
  if (existsSync(target)) {
    try { rmSync(target, { recursive: true, force: true }); } catch {}
  }
}

const spokeName = spokeNameArg || await p.text({
  message: "🏷️  Spoke name",
  placeholder: "My Spoke (leave blank to skip)",
});
if (p.isCancel(spokeName)) { p.cancel("Cancelled."); process.exit(0); }

const spokeAddress = spokeArg || await p.text({
  message: "🔐 Spoke address",
  placeholder: "0x… (leave blank to skip)",
  initialValue: "0xb576765fB15505433aF24FEe2c0325895C559FB2",
  validate: (v) => v && !/^0x[0-9a-fA-F]{40}$/.test(v) ? "Not a valid Ethereum address." : undefined,
});
if (p.isCancel(spokeAddress)) { p.cancel("Cancelled."); process.exit(0); }

const chain = chainArg || await p.select({
  message: "⛓️  Chain connector",
  options: CHAINS.map((c) => ({ value: c.name, label: c.name, hint: c.desc })),
});
if (p.isCancel(chain)) { p.cancel("Cancelled."); process.exit(0); }

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
try {
  await degit(REPO, { cache: false, force: true }).clone(target);
} catch (err) {
  spinner.stop("❌ Download failed.");
  cleanup();
  p.cancel(err.message);
  process.exit(1);
}
spinner.stop("✅ Template downloaded.");

// Remove the CLI package from the cloned template — not needed in the user's app
const cliDir = join(target, "create-spoke-folks");
if (existsSync(cliDir)) rmSync(cliDir, { recursive: true, force: true });

// ── Replace root page with a redirect to /spoke ───────────────────────────────
writeFileSync(
  join(target, "app", "page.tsx"),
  `import { redirect } from "next/navigation";\nexport default function Home() { redirect("/spoke"); }\n`
);

// ── Apply spoke name / address ────────────────────────────────────────────────
if (spokeName || spokeAddress || chain) {
  let env = "";
  if (spokeName)    env += `NEXT_PUBLIC_SPOKE_NAME=${spokeName}\n`;
  if (spokeAddress) env += `NEXT_PUBLIC_SPOKE_ADDRESS=${spokeAddress}\n`;
  if (chain)        env += `NEXT_PUBLIC_CHAIN=${chain}\n`;
  writeFileSync(resolve(target, ".env.local"), env);
}

// ── Apply theme ───────────────────────────────────────────────────────────────
const layoutPath = join(target, "app", "layout.tsx");
writeFileSync(layoutPath, readFileSync(layoutPath, "utf8").replace(/data-theme="[^"]+"/, `data-theme="${theme}"`));

// ── Strip unused wallet providers ─────────────────────────────────────────────
const chainKey    = chain === "EVM" ? "evm" : chain === "Solana" ? "solana" : "algorand";
const allChainFiles = ["evm", "solana", "algorand"];

// Rewrite providers/index.tsx to import the chosen chain only
writeFileSync(
  join(target, "app", "providers", "index.tsx"),
  `export { WalletProvider, ConnectButton } from "./${chainKey}";\n`
);

// Delete provider files for unchosen chains
for (const f of allChainFiles) {
  if (f !== chainKey) {
    const p = join(target, "app", "providers", `${f}.tsx`);
    if (existsSync(p)) unlinkSync(p);
  }
}

// Remove unchosen chains' packages from package.json before npm install
const pkgPath = join(target, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const chainDeps = pkg._chainDeps || {};
for (const [c, deps] of Object.entries(chainDeps)) {
  if (c !== chainKey) {
    for (const dep of deps) delete pkg.dependencies[dep];
  }
}
delete pkg._chainDeps;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// ── Write project README ──────────────────────────────────────────────────────
const readmeRows = [
  spokeName    ? `| **Spoke name**    | ${spokeName} |`        : null,
  spokeAddress ? `| **Spoke address** | \`${spokeAddress}\` |` : null,
  `| **Chain**         | ${chain} |`,
  `| **Theme**         | ${theme} |`,
].filter(Boolean);
writeFileSync(join(target, "README.md"), [
  `# ${spokeName || projectName}`,
  ``,
  `A DeFi borrow market app scaffolded with [create-spoke-folks](https://github.com/mathieuadriano/cli-app).`,
  ``,
  `## Project details`,
  ``,
  `| | |`,
  `|---|---|`,
  ...readmeRows,
  ``,
  `## Getting started`,
  ``,
  `\`\`\`bash`,
  `cd ${projectName}`,
  `npm run dev`,
  `\`\`\``,
  ``,
  `Open [http://localhost:3000/spoke](http://localhost:3000/spoke) in your browser.`,
  ``,
  `## Build`,
  ``,
  `\`\`\`bash`,
  `npm run build`,
  `\`\`\``,
  ``,
].join("\n"));

// ── Install dependencies ──────────────────────────────────────────────────────
const finalPkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const deps     = Object.keys(finalPkg.dependencies   || {});
const devDeps  = Object.keys(finalPkg.devDependencies || {});

p.log.info(
  `📦 Installing ${deps.length + devDeps.length} packages\n` +
  `\n  dependencies (${deps.length})\n` +
  deps.map((d) => `    · ${d}`).join("\n") +
  `\n\n  devDependencies (${devDeps.length})\n` +
  devDeps.map((d) => `    · ${d}`).join("\n")
);

spinner.start("📥 Installing…");
try {
  execSync("npm install", { cwd: target, stdio: "pipe" });
  spinner.stop(`✅ ${deps.length + devDeps.length} packages installed.`);
} catch (err) {
  spinner.stop("❌ Installation failed.");
  p.log.error(err.stderr?.toString().trim() || err.message);
  cleanup();
  process.exit(1);
}

// ── Git setup ─────────────────────────────────────────────────────────────────
spinner.start("🔧 Initializing git repository…");
try {
  execSync("git init", { cwd: target, stdio: "ignore" });
  execSync('git config user.email "scaffold@create-spoke-folks"', { cwd: target, stdio: "ignore" });
  execSync('git config user.name "create-spoke-folks"', { cwd: target, stdio: "ignore" });
  spinner.message("🔧 Staging files…");
  execSync("git add -A", { cwd: target, stdio: "ignore" });
  spinner.message("🔧 Creating initial commit…");
  execSync(`git commit -m "Initial commit from create-spoke-folks"`, { cwd: target, stdio: "ignore" });
  spinner.stop("✅ Git repository initialized.");
} catch (err) {
  spinner.stop("❌ Git setup failed.");
  p.log.error(err.stderr?.toString().trim() || err.message);
  cleanup();
  process.exit(1);
}

// ── Push to GitHub ────────────────────────────────────────────────────────────
let pushedToGitHub = false;
let deployUrl = null;
let connectedGitToVercel = false;

if (remote) {
  spinner.start("🐙 Pushing to GitHub…");
  try {
    try {
      execSync(`git remote add origin ${remote}`, { cwd: target, stdio: "pipe" });
    } catch {
      execSync(`git remote set-url origin ${remote}`, { cwd: target, stdio: "pipe" });
    }
    execSync("git push -u origin HEAD", { cwd: target, stdio: "pipe" });
    pushedToGitHub = true;
    spinner.stop("✅ Code pushed to GitHub.");
  } catch (err) {
    spinner.stop("❌ Push failed.");
    const stderr = err.stderr?.toString().trim();
    if (stderr) p.log.warn(stderr);
    p.log.info(
      "Common causes:\n" +
      "  • Repo doesn't exist yet → create it at github.com first (empty, no README)\n" +
      "  • Auth failed → check SSH keys or run: gh auth login\n" +
      `  • Fix & retry: cd ${projectName} && git push -u origin HEAD`
    );
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
  if (spokeName)    vercelArgs.push("--build-env", `NEXT_PUBLIC_SPOKE_NAME=${spokeName}`);
  if (spokeAddress) vercelArgs.push("--build-env", `NEXT_PUBLIC_SPOKE_ADDRESS=${spokeAddress}`);
  if (chain)        vercelArgs.push("--build-env", `NEXT_PUBLIC_CHAIN=${chain}`);

  const proc = spawn("vercel", vercelArgs, { cwd: target, stdio: ["inherit", "pipe", "pipe"] });

  let buf = "";
  const handleChunk = (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const raw of lines) {
      const segs = raw.split("\r").map((s) => s.trim()).filter(Boolean);
      const line = segs[segs.length - 1] ?? "";
      if (!line) continue;
      logStream.write(line + "\n");

      if (line.startsWith("Production:") || (line.includes(".vercel.app") && !line.includes("go to"))) {
        const urlMatch = line.match(/https:\/\/[^\s]+\.vercel\.app/);
        if (urlMatch && !deployUrl) deployUrl = urlMatch[0];
        const clean = line.replace(/Building|Completing/g, "").trim();
        if (clean) process.stdout.write(`  ${clean}\n`);
        if (!buildTimer) startBuild();
        continue;
      }

      if (line.includes("Deployed to production")) {
        stopBuild("Deployed to production! 🚀");
        process.stdout.write(`  ${line}\n`);
        continue;
      }

      if (/Building|Completing/.test(line)) {
        if (!buildTimer) startBuild();
        continue;
      }

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
  if (deployedToVercel && (spokeName || spokeAddress)) {
    spinner.start("🔑 Persisting env vars in Vercel…");
    try {
      if (spokeName)    execSync("vercel env add NEXT_PUBLIC_SPOKE_NAME production",    { cwd: target, input: spokeName,    stdio: ["pipe", "ignore", "ignore"] });
      if (spokeAddress) execSync("vercel env add NEXT_PUBLIC_SPOKE_ADDRESS production", { cwd: target, input: spokeAddress, stdio: ["pipe", "ignore", "ignore"] });
      if (chain)        execSync("vercel env add NEXT_PUBLIC_CHAIN production",         { cwd: target, input: chain,        stdio: ["pipe", "ignore", "ignore"] });
      spinner.stop("✅ Env vars saved to Vercel project.");
    } catch {
      spinner.stop("⚠️  Could not persist env vars — add them manually in Vercel project settings.");
    }
  }

  // Re-add origin so vercel git connect can read it from .git/config
  if (remote) {
    try { execSync(`git remote add origin ${remote}`, { cwd: target, stdio: "ignore" }); } catch {}
  }

  // Offer to connect the GitHub repo to the Vercel project
  if (deployedToVercel && pushedToGitHub) {
    const out = existsSync(vercelLog) ? readFileSync(vercelLog, "utf8") : "";
    const match = out.match(/Linked to ([^/\s]+)\/([^(\s\n]+)/);
    const settingsUrl = match
      ? `https://vercel.com/${match[1]}/${match[2]}/settings/git`
      : "https://vercel.com";

    const connectGit = await p.confirm({ message: "🔗 Connect your GitHub repo to this Vercel deployment?" });
    if (!p.isCancel(connectGit) && connectGit) {
      spinner.start("🔗 Connecting GitHub repo to Vercel…");
      try {
        const result = execSync("vercel git connect --yes", { cwd: target, stdio: ["inherit", "pipe", "pipe"] });
        if (result) process.stdout.write(result.toString());
        connectedGitToVercel = true;
        spinner.stop("✅ GitHub repo connected — every push will trigger a new deployment.");
      } catch (err) {
        const errText = (err.stderr?.toString() || "") + (err.stdout?.toString() || "");
        if (errText) process.stdout.write(errText);
        spinner.stop("⚠️  Could not auto-connect — opening Vercel project settings in your browser.");
        openBrowser(settingsUrl);
        p.log.info(
          "In the browser:\n" +
          "  1. Under \"Git Repository\", click Connect\n" +
          "  2. Select your GitHub account and find your repo\n" +
          "  3. Click Connect — future pushes will trigger a new deployment automatically"
        );
      }
    }
  }
}

// ── Recap ─────────────────────────────────────────────────────────────────────
const recapLines = [
  `📁 ${projectName} cloned on your machine`,
  spokeName        && `🏷️  Spoke name: ${spokeName}`,
  spokeAddress     && `🔐 Spoke address: ${spokeAddress}`,
  chain            && `⛓️  Chain: ${chain}`,
  `🎨 Theme: ${theme}`,
  pushedToGitHub   && `🐙 Code pushed to GitHub (${remote})`,
  deployedToVercel && `🚀 Project deployed on Vercel`,
  deployedToVercel && deployUrl && `🏦 Borrow page →  ${deployUrl}/spoke`,
  connectedGitToVercel && `⚡ Every push to GitHub triggers a new Vercel deployment`,
  deployedToVercel && `🔧 Add a custom domain in your Vercel project settings`,
].filter(Boolean).join("\n");

p.note(recapLines, "🎉 Summary");

p.outro(`🛠️  Start building  →  cd ${projectName} && npm run dev\n         http://localhost:3000/spoke`);
