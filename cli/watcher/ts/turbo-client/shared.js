function removeComments(code = "") {
  return code
    .replace(
      /(['"`])(\\.|[^\x01\\])*?\1|\/\/.*|\/\*[\s\S]*?\*\//gm,
      (match, quote) => (quote ? match : "")
    )
    .replace(/\s+/g, " ");
}

function addDotJsToImports(code) {
  return code.replace(
    /from\s+["'](\.{1,2}\/[^"']*)["']/g,
    (match, importPath) => {
      // Skip if already ends with .js or has an extension
      if (importPath.endsWith(".js") || /\.\w+$/.test(importPath)) {
        return match;
      }
      return `from "${importPath}.mjs"`;
    }
  );
}

function getDuration(durationInMs) {
  if (durationInMs >= 1000) {
    return `${(durationInMs / 1000).toFixed(1)}s`;
  } else {
    return `${durationInMs.toFixed(0)}ms`;
  }
}

export { getDuration, addDotJsToImports, removeComments };
