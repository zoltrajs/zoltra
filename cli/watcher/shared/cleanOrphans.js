import { existsSync, promises as fs } from "fs";
import path from "path";

export async function cleanOrphanedFiles(logger) {
  const isTs = path.join(process.cwd(), "tsconfig.json");

  if (!existsSync(isTs)) {
    return;
  }

  const srcDir = path.join(process.cwd(), "/");
  const distDir = path.join(process.cwd(), "dist");

  let orphansRemoved = 0;

  // 1. Get all source files (relative paths without extensions)
  const srcFiles = new Set();
  await collectSourceFiles(srcDir, srcDir, srcFiles);

  // 2. Scan dist directory and compare
  await processDistDirectory(distDir, srcDir, distDir, srcFiles, logger);

  async function collectSourceFiles(currentDir, rootDir, fileSet) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        await collectSourceFiles(fullPath, rootDir, fileSet);
      } else if (
        entry.isFile() &&
        [".ts", ".tsx"].includes(path.extname(entry.name))
      ) {
        // Store path without extension (e.g. 'routes/users' instead of 'routes/users.ts')
        fileSet.add(relativePath.slice(0, -path.extname(entry.name).length));
      }
    }
  }

  async function processDistDirectory(
    currentDir,
    srcDir,
    distRoot,
    srcFiles,
    logger
  ) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativeToDist = path.relative(distRoot, fullPath);

      if (entry.isDirectory()) {
        await processDistDirectory(
          fullPath,
          srcDir,
          distRoot,
          srcFiles,
          logger
        );

        // Optional: Remove empty directories
        const dirEntries = await fs.readdir(fullPath);
        if (dirEntries.length === 0) {
          await fs.rmdir(fullPath);
        }
      } else if (
        entry.isFile() &&
        [".js", ".mjs"].includes(path.extname(entry.name))
      ) {
        // Check if corresponding source file exists
        const srcKey = relativeToDist.slice(
          0,
          -path.extname(entry.name).length
        );
        if (!srcFiles.has(srcKey)) {
          await fs.unlink(fullPath);
          logger.info(`Removed orphan: ${relativeToDist}`);
          orphansRemoved++;
        }
      }
    }
  }

  return orphansRemoved;
}
