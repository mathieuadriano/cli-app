#!/usr/bin/env node

import degit from "degit";
import { execSync } from "child_process";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { resolve, join as pathJoin } from "path";
import { createInterface } from "readline";

const VALID_THEMES = ["dark", "light", "gray", "ocean", "purple"];

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try { execSync(`${cmd} "${url}"`, { stdio: "ignore" }); } catch {}
}


const REPO = "mathieuadriano/cli-app";
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));
const vaultFlag = args.indexOf("--vault-address");
const vaultAddress = vaultFlag !== -1 ? args[vaultFlag + 1] : null;
const themeFlag = args.indexOf("--theme");
const theme = themeFlag !== -1 ? args[themeFlag + 1] : "dark";

if (!name) {
  console.log(`
  ${bold("create-vault-folks")}

  Usage:
    ${green("npx create-vault-folks@latest")} ${dim("<project-name> [--vault-address <address>] [--theme <name>]")}

  Themes: ${VALID_THEMES.join(", ")}

  Example:
    ${green("npx create-vault-folks@latest")} my-vault-app ${dim("--vault-address 0xAbC123… --theme ocean")}
`);
  process.exit(0);
}

if (vaultAddress !== null && !/^0x[0-9a-fA-F]{40}$/.test(vaultAddress)) {
  console.error(`\n  ${red("Error:")} "${vaultAddress}" is not a valid Ethereum address.\n`);
  process.exit(1);
}

if (!VALID_THEMES.includes(theme)) {
  console.error(`\n  ${red("Error:")} "${theme}" is not a valid theme. Choose from: ${VALID_THEMES.join(", ")}.\n`);
  process.exit(1);
}

if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
  console.error(`\n  ${red("Error:")} "${name}" is not a valid project name.\n`);
  process.exit(1);
}

const target = resolve(process.cwd(), name);

if (existsSync(target)) {
  console.error(`\n  ${red("Error:")} directory "${name}" already exists.\n`);
  process.exit(1);
}

// Check git is available before doing anything
try {
  const version = execSync("git --version", { encoding: "utf8" }).trim();
  console.log(`\n  ${green("✓")} ${version} detected`);
} catch {
  console.error(`\n  ${red("✗")} git is not installed or not in your PATH.`);
  console.error(`  Install git at https://git-scm.com and try again.\n`);
  process.exit(1);
}

console.log(`\n  ${bold("create-vault-folks")}\n`);
console.log(`  Downloading template…`);

const emitter = degit(REPO, { cache: false, force: true });

await emitter.clone(target).catch((err) => {
  console.error(`\n  ${red("Error:")} ${err.message}\n`);
  process.exit(1);
});

if (vaultAddress) {
  writeFileSync(
    resolve(target, ".env.local"),
    `NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}\n`
  );
  console.log(`  Vault address set: ${dim(vaultAddress)}`);
}

if (theme !== "dark") {
  const layoutPath = pathJoin(target, "app", "layout.tsx");
  const layout = readFileSync(layoutPath, "utf8");
  writeFileSync(layoutPath, layout.replace('data-theme="dark"', `data-theme="${theme}"`));
}
console.log(`  ${green("✓")} Theme set: ${dim(theme)}`);

console.log(`  Installing dependencies…\n`);

execSync("npm install", { cwd: target, stdio: "inherit" });

console.log(`\n  Git`);
execSync("git init", { cwd: target, stdio: "ignore" });
console.log(`  ${green("✓")} Initialized empty repository`);

execSync("git add -A", { cwd: target, stdio: "ignore" });
console.log(`  ${green("✓")} Staged all files`);

execSync("git commit -m \"Initial commit from create-vault-folks\"", { cwd: target, stdio: "ignore" });
console.log(`  ${green("✓")} Created initial commit`);

const remote = await prompt(`\n  Remote URL ${dim("(leave blank to skip)")}:  `);
const linkVercel = remote
  ? (await prompt(`  Deploy to Vercel? ${dim("(y/N)")}:  `)).toLowerCase() === "y"
  : false;

let pushedToGitHub = false;
let deployedToVercel = false;

if (remote) {
  console.log(`\n  GitHub`);
  try {
    execSync(`git remote add origin ${remote}`, { cwd: target, stdio: "ignore" });
    console.log(`  ${green("✓")} Remote set to ${dim(remote)}`);
    execSync("git push -u origin HEAD", { cwd: target, stdio: "pipe" });
    console.log(`  ${green("✓")} Code pushed to remote`);
    pushedToGitHub = true;
  } catch (err) {
    console.error(`  ${red("✗")} Push failed: ${err.stderr?.toString().trim() || err.message}`);
    console.error(`  ${dim("Run manually: git remote add origin <url> && git push -u origin HEAD")}`);
  }
} else {
  console.log(`\n  ${dim("GitHub skipped — push manually when ready")}`);
}

if (linkVercel) {
  console.log(`\n  Vercel`);

  try {
    execSync("vercel --version", { stdio: "ignore" });
    console.log(`  ${green("✓")} Vercel CLI detected`);
  } catch {
    console.log(`  Installing Vercel CLI…`);
    execSync("npm install -g vercel", { stdio: "inherit" });
    console.log(`  ${green("✓")} Vercel CLI installed`);
  }

  console.log(`  ${dim("Deploying — a browser window will open to authenticate if needed…")}\n`);

  // Remove remote temporarily so Vercel doesn't try to auto-connect GitHub
  try { execSync("git remote remove origin", { cwd: target, stdio: "ignore" }); } catch {}

  const vercelLog = join(tmpdir(), `vercel-${Date.now()}.log`);

  try {
    execSync(`vercel --yes 2>&1 | tee "${vercelLog}"`, { cwd: target, stdio: "inherit", shell: true });
    deployedToVercel = true;
    console.log(`\n  ${green("✓")} Project deployed to Vercel`);
  } catch {
    console.error(`  ${red("✗")} Deploy failed — run ${bold("vercel")} inside the project manually.`);
  }

  // Restore the remote
  if (remote) {
    try { execSync(`git remote add origin ${remote}`, { cwd: target, stdio: "ignore" }); } catch {}
  }

  if (deployedToVercel) {
    const vercelOutput = existsSync(vercelLog) ? readFileSync(vercelLog, "utf8") : "";
    const match = vercelOutput.match(/Linked to ([^/\s]+)\/([^(\s\n]+)/);
    const settingsUrl = match
      ? `https://vercel.com/${match[1]}/${match[2]}/settings/git`
      : "https://vercel.com";

    const connectGit = (await prompt(`\n  Connect your GitHub repo to this Vercel deployment? ${dim("(y/N)")}:  `)).toLowerCase() === "y";
    if (connectGit) {
      console.log(`  ${dim("Opening Vercel Git settings…")}`);
      openBrowser(settingsUrl);
      console.log(`  ${green("✓")} ${settingsUrl}`);
    }
  }
}

const recap = [
  `  ${green("✓")} ${bold(name)} has been cloned on your machine`,
  pushedToGitHub && `  ${green("✓")} Code has been pushed to your GitHub account ${dim(`(${remote})`)}`,
  deployedToVercel && `  ${green("✓")} Project has been deployed on Vercel`,
  pushedToGitHub && deployedToVercel && `  ${green("✓")} Every new push to GitHub will trigger a new deployment on Vercel`,
].filter(Boolean);

console.log(`\n  ── Recap ──────────────────────────────────\n`);
recap.forEach((line) => console.log(line));
if (deployedToVercel) {
  console.log(`\n  ${dim("Tip:")} Feel free to add your own domain in your Vercel project settings.`);
}
console.log(`\n  ────────────────────────────────────────────`);
console.log(`\n  ${dim("Start dev server:")}`);
console.log(`\n    cd ${name}`);
console.log(`    npm run dev\n`);
