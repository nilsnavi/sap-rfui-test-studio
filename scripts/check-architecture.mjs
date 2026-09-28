#!/usr/bin/env node
/**
 * Architecture guard (PROMPT-001 §15, ADR-001 §6).
 *
 * Dependency direction must stay:
 *
 *   UI → Application → Domain → Ports ↑ Adapters
 *
 * Enforced here without a heavyweight framework:
 *   1. Forbidden module imports per layer.
 *   2. Forbidden platform globals in Domain / Ports / Application.
 *   3. Adapters may only be wired inside the composition root.
 *
 * Run: pnpm check:architecture
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCOPES = ["packages/domain/src", "packages/ports/src", "packages/application/src", "packages/ui/src", "apps/desktop/src"];

/** Module specifiers that a scope is never allowed to import. */
const FORBIDDEN_MODULES = {
  "packages/domain/src": [
    { pattern: /^react($|\/)/, reason: "Domain must not import React" },
    { pattern: /^react-dom($|\/)/, reason: "Domain must not import React" },
    { pattern: /^@tauri-apps\//, reason: "Domain must not import Tauri" },
    { pattern: /^zustand/, reason: "Domain must not import state libraries" },
    { pattern: /^zod/, reason: "Domain must not import validation libraries" },
    { pattern: /sqlite/i, reason: "Domain must not import SQLite" },
    { pattern: /^@sap-rfui\/(ports|application|ui|desktop)/, reason: "Domain depends on nothing above it" },
  ],
  "packages/ports/src": [
    { pattern: /^react/, reason: "Ports must not import React" },
    { pattern: /^@tauri-apps\//, reason: "Ports must not import Tauri" },
    { pattern: /^zustand/, reason: "Ports must not import state libraries" },
    { pattern: /^zod/, reason: "Ports must not import validation libraries" },
    { pattern: /sqlite/i, reason: "Ports must not import SQLite drivers" },
    { pattern: /^@sap-rfui\/(application|ui|desktop)/, reason: "Ports must not depend on upper layers" },
  ],
  "packages/application/src": [
    { pattern: /^react/, reason: "Application must not import React" },
    { pattern: /^@tauri-apps\//, reason: "Application must not import Tauri" },
    { pattern: /^zustand/, reason: "Application must not import the UI state library" },
    { pattern: /sqlite/i, reason: "Application reaches storage only through StoragePort" },
    { pattern: /^@sap-rfui\/ui/, reason: "Application must not import Desktop UI" },
    { pattern: /^@sap-rfui\/desktop/, reason: "Application must not import Desktop UI" },
  ],
  "packages/ui/src": [
    { pattern: /^@sap-rfui\/(domain|application|ports|desktop)/, reason: "Reusable UI must stay product-agnostic" },
    { pattern: /^@tauri-apps\//, reason: "Reusable UI must not know about Tauri" },
    { pattern: /^zustand/, reason: "Reusable UI must not own application state" },
    { pattern: /^zod/, reason: "Reusable UI must not validate domain payloads" },
  ],
  "apps/desktop/src": [
    { pattern: /sqlite/i, reason: "Desktop uses storage only through StoragePort adapters" },
  ],
};

/** Platform globals forbidden in the pure layers. */
const FORBIDDEN_GLOBALS = {
  "packages/domain/src": ["window", "document", "localStorage", "navigator", "fetch", "console", "XMLHttpRequest"],
  "packages/ports/src": ["window", "document", "localStorage", "navigator", "fetch", "console", "XMLHttpRequest"],
  "packages/application/src": ["window", "document", "localStorage", "navigator", "fetch", "console", "XMLHttpRequest"],
};

/** Regexes capturing every module specifier a file depends on. */
const IMPORT_PATTERNS = [
  /(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g,
  /(?:^|\n)\s*export\s+(?:[^'"]*?\s+from\s+)["']([^"']+)["']/g,
  /(?:^|\n)\s*import\s*\(\s*["']([^"']+)["']\s*\)/g,
  /require\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function sourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".d.ts")) {
      found.push(full);
    }
  }
  return found;
}

function toPosix(path) {
  return path.split(sep).join(posix.sep);
}

function isTestFile(path) {
  return /\.test\.tsx?$/.test(path);
}

function isCompositionPath(path) {
  return path.includes("app/composition/") || path.includes("/adapters/");
}

function specifiers(source) {
  const result = [];
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      result.push({ specifier: match[1], line });
    }
  }
  return result;
}

function violations() {
  const list = [];

  for (const scope of SCOPES) {
    const absolute = join(ROOT, scope);
    let stats;
    try {
      stats = statSync(absolute);
    } catch {
      list.push(`${scope}: scope directory is missing (guard configuration is stale)`);
      continue;
    }
    if (!stats.isDirectory()) {
      continue;
    }

    for (const file of sourceFiles(absolute)) {
      const relFile = toPosix(relative(ROOT, file));
      const source = readFileSync(file, "utf8");

      for (const { specifier, line } of specifiers(source)) {
        for (const rule of FORBIDDEN_MODULES[scope] ?? []) {
          if (rule.pattern.test(specifier)) {
            list.push(`${relFile}:${line} — ${specifier} → ${rule.reason}`);
          }
        }

        // Adapters are wired exclusively in the composition root (ADR-001 §7).
        if (
          scope === "apps/desktop/src" &&
          !isCompositionPath(relFile) &&
          !isTestFile(file) &&
          specifier.includes("adapters/")
        ) {
          list.push(`${relFile}:${line} — ${specifier} → adapters may only be imported by the composition root`);
        }
      }

      const forbiddenGlobals = FORBIDDEN_GLOBALS[scope] ?? [];
      if (forbiddenGlobals.length > 0) {
        const code = stripCommentsAndStrings(source);
        for (const global of forbiddenGlobals) {
          const hit = new RegExp(`(^|[^\\w$.])${global}\\s*[.\\[(]`).exec(code);
          if (hit !== null) {
            const line = code.slice(0, hit.index).split("\n").length;
            list.push(`${relFile}:${line} — \`${global}\` → ${scope} must stay platform-independent`);
          }
        }
      }
    }
  }

  return list;
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, "$1$1");
}

const found = violations();

if (found.length > 0) {
  process.stderr.write("Architecture guard FAILED\n\n");
  for (const violation of found) {
    process.stderr.write(`  ✗ ${violation}\n`);
  }
  process.stderr.write(`\n${found.length} violation(s). See docs/architecture/ADR-001-modular-architecture.md\n`);
  process.exit(1);
}

process.stdout.write(`Architecture guard passed — ${SCOPES.length} layers, dependency direction preserved.\n`);
