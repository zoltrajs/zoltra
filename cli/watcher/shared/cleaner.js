import { promises as fs } from "fs";
import path from "path";

export async function removeExtensionDuplicates(turboEnabled, logger) {
  const targetExt = turboEnabled ? ".js" : ".mjs"; // Files to DELETE
  const keepExt = turboEnabled ? ".mjs" : ".js"; // Files to KEEP
  let duplicatesRemoved = 0;
  const dir = path.join(process.cwd(), "/dist");

  async function processDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(fullPath); // Recurse into subdirectories
        continue;
      }

      const fileExt = path.extname(entry.name);
      if (![".js", ".mjs"].includes(fileExt) || fileExt === keepExt) continue;

      const baseName = path.basename(entry.name, fileExt);
      const counterpartPath = path.join(currentDir, `${baseName}${keepExt}`);

      try {
        await fs.access(counterpartPath);
        await fs.unlink(fullPath);
        logger.info(`Removed duplicate: ${path.relative(dir, fullPath)}`);
        duplicatesRemoved++;
      } catch {
        // Counterpart doesn't exist - skip
      }
    }
  }

  await processDirectory(dir);
  return duplicatesRemoved;
}
