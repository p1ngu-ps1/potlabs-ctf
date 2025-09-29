#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CHALLENGE_DIR = path.resolve(
  __dirname,
  "../var/www/potlabs-ctf/challenges"
);
const DEFAULT_OUTPUT = path.join(DEFAULT_CHALLENGE_DIR, "index.json");
const ALLOWED_EXTENSIONS = new Set([".md", ".md5", ".txt"]);

const args = process.argv.slice(2);
const challengesDir = path.resolve(args[0] || DEFAULT_CHALLENGE_DIR);
const outputFile = path.resolve(args[1] || DEFAULT_OUTPUT);

const titleFromFilename = (filename) =>
  filename
    .replace(/\.(md|md5|txt)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const collectPromptFiles = async (dir, basePath) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const prompts = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;

    const id = entry.name.replace(/\.(md|md5|txt)$/i, "");
    prompts.push({
      id,
      title: titleFromFilename(entry.name),
      file: entry.name,
      tags: []
    });
  }

  if (!prompts.length) return null;

  const resolvedBase = basePath.replace(/\\/g, "/");
  return {
    basePath: resolvedBase,
    prompts
  };
};

const main = async () => {
  const collections = [];
  const timestamp = new Date().toISOString().slice(0, 10);

  const rootEntries = await fs.readdir(challengesDir, { withFileTypes: true });

  // Handle top-level prompt files (without a collection folder)
  const topLevelCollection = await collectPromptFiles(
    challengesDir,
    "challenges"
  );
  if (topLevelCollection) {
    collections.push({
      id: "root",
      title: "Root Collection",
      description: "Loose prompts stored at the top level.",
      ...topLevelCollection
    });
  }

  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(challengesDir, entry.name);
    const basePath = path.join("challenges", entry.name);

    const result = await collectPromptFiles(fullPath, basePath);
    if (!result) continue;

    collections.push({
      id: entry.name,
      title: titleFromFilename(entry.name),
      description: "",
      ...result
    });
  }

  const payload = {
    updated: timestamp,
    collections
  };

  await fs.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(
    `Generated ${collections.length} collection(s) at ${outputFile}\n`
  );
};

main().catch((error) => {
  console.error("Failed to generate challenge index:", error);
  process.exit(1);
});
