import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectInfo } from "./types.ts";

/**
 * Decode an encoded project directory name back to the original path.
 * e.g. "-Users-kt3k-oss-foo" → "/Users/kt3k/oss/foo"
 */
export function decodeProjectPath(encoded: string): string {
  // The encoding replaces "/" with "-", and the path starts with "/",
  // so the encoded form starts with "-".
  // We restore by replacing "-" back to "/".
  return encoded.replace(/-/g, "/");
}

/**
 * Scan a projects directory and return information about each project
 * and its session files.
 */
export function scanProjects(projectsDir: string): ProjectInfo[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects: ProjectInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(projectsDir, entry.name);
    const sessionFiles = listSessionFiles(projectDir);

    projects.push({
      encodedPath: entry.name,
      projectPath: decodeProjectPath(entry.name),
      sessionFiles,
    });
  }

  return projects;
}

/**
 * List .jsonl files in a project directory, excluding subdirectories
 * like memory/.
 */
function listSessionFiles(projectDir: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(projectDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(path.join(projectDir, entry.name));
    }
  }

  return files.sort();
}
