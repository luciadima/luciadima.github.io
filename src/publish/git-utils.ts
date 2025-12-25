/**
 * Git utilities for extracting metadata from file history
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import type { GitFileInfo } from './types.js';

/**
 * Get git history information for a file
 */
export function getGitFileInfo(filePath: string): GitFileInfo {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);

  try {
    // Get the first commit date (creation date) and author
    // Using %aI for ISO 8601 format, %an for author name
    const firstCommit = execSync(
      `git log --follow --format="%aI|%an" --diff-filter=A -- "${filename}"`,
      { cwd: dir, encoding: 'utf-8' }
    ).trim();

    // Get the most recent commit date
    const lastCommit = execSync(
      `git log -1 --format="%aI" -- "${filename}"`,
      { cwd: dir, encoding: 'utf-8' }
    ).trim();

    let createdDate: Date;
    let author: string;

    if (firstCommit) {
      const [dateStr, authorName] = firstCommit.split('|');
      createdDate = new Date(dateStr);
      author = authorName || 'Unknown';
    } else {
      // File not yet committed, use current date
      createdDate = new Date();
      author = 'Unknown';
    }

    const modifiedDate = lastCommit ? new Date(lastCommit) : createdDate;

    return {
      createdDate,
      modifiedDate,
      author,
    };
  } catch (error) {
    // If git commands fail (e.g., file not in git), return defaults
    console.warn(`Warning: Could not get git info for ${filePath}:`, error);
    return {
      createdDate: new Date(),
      modifiedDate: new Date(),
      author: 'Unknown',
    };
  }
}

/**
 * Check if a file has uncommitted changes
 */
export function hasUncommittedChanges(filePath: string): boolean {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);

  try {
    const status = execSync(`git status --porcelain -- "${filename}"`, {
      cwd: dir,
      encoding: 'utf-8',
    }).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the repository root directory
 */
export function getRepoRoot(fromPath: string): string {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd: fromPath,
      encoding: 'utf-8',
    }).trim();
  } catch {
    throw new Error('Not in a git repository');
  }
}
