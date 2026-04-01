import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stageDir = join(rootDir, ".mcpb-build");
const outputPath = join(rootDir, "eight-sleep-mcp.mcpb");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const mcpbCliPath = join(
  rootDir,
  "node_modules",
  "@anthropic-ai",
  "mcpb",
  "dist",
  "cli",
  "cli.js",
);

const stageEntries = [
  "dist",
  "LICENSE",
  "README.md",
  "manifest.json",
  "package.json",
  "package-lock.json",
];
const stageIgnorePatterns = [
  ".mcpbignore",
  "package-lock.json",
  "node_modules/.package-lock.json",
  "node_modules/**/.github/",
  "node_modules/**/docs/",
  "node_modules/**/doc/",
  "node_modules/**/example/",
  "node_modules/**/examples/",
  "node_modules/**/test/",
  "node_modules/**/tests/",
  "node_modules/**/*.test.*",
  "node_modules/**/*.spec.*",
  "node_modules/**/*.ts",
  "node_modules/**/*.map",
  "node_modules/**/README*",
  "node_modules/**/LICENSE*",
];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

rmSync(stageDir, { recursive: true, force: true });
rmSync(outputPath, { force: true });
mkdirSync(stageDir, { recursive: true });

for (const entry of stageEntries) {
  const sourcePath = join(rootDir, entry);
  if (!existsSync(sourcePath)) {
    continue;
  }

  cpSync(sourcePath, join(stageDir, entry), {
    recursive: true,
  });
}

run(
  npmCommand,
  ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
  stageDir,
);

rmSync(join(stageDir, "package-lock.json"), { force: true });
rmSync(join(stageDir, "node_modules", ".package-lock.json"), { force: true });
writeFileSync(join(stageDir, ".mcpbignore"), `${stageIgnorePatterns.join("\n")}\n`);

run(process.execPath, [mcpbCliPath, "pack", stageDir, outputPath], rootDir);

rmSync(stageDir, { recursive: true, force: true });
