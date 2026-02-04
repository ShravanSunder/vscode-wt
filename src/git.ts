import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface GitInfo {
	repoIdentifier: string;
	isWorktree: boolean;
	mainWorktreePath: string | undefined;
	gitDir: string;
	worktreeIndex: number;
}

/**
 * Normalize a git remote URL to a consistent identifier
 * SSH: git@github.com:user/repo.git → github.com/user/repo
 * HTTPS: https://github.com/user/repo.git → github.com/user/repo
 */
export function normalizeGitUrl(url: string): string {
	let normalized = url.trim();

	// Convert SSH to standard format
	const sshMatch = normalized.match(/^git@([^:]+):(.+)$/);
	if (sshMatch?.[1] !== undefined && sshMatch[2] !== undefined) {
		normalized = `${sshMatch[1]}/${sshMatch[2]}`;
	}

	// Remove protocol
	normalized = normalized.replace(/^https?:\/\//, '');
	normalized = normalized.replace(/^git:\/\//, '');

	// Remove .git suffix and trailing slashes
	normalized = normalized.replace(/\.git$/, '');
	normalized = normalized.replace(/\/+$/, '');

	return normalized.toLowerCase();
}

/**
 * Execute a git command in the specified directory
 */
async function execGit(
	command: string,
	cwd: string
): Promise<{ stdout: string; stderr: string } | null> {
	try {
		return await execAsync(`git ${command}`, { cwd, timeout: 10000 });
	} catch {
		return null;
	}
}

/**
 * Get the remote URL for the repository
 */
async function getRemoteUrl(cwd: string): Promise<string | null> {
	const result = await execGit('config --get remote.origin.url', cwd);
	return result?.stdout.trim() ?? null;
}

/**
 * Get the top-level directory of the git repository
 */
async function getGitTopLevel(cwd: string): Promise<string | null> {
	const result = await execGit('rev-parse --show-toplevel', cwd);
	return result?.stdout.trim() ?? null;
}

/**
 * Parse the .git file content to extract the gitdir path
 */
function parseGitFile(content: string): string | null {
	const match = content.match(/^gitdir:\s*(.+)$/m);
	return match?.[1]?.trim() ?? null;
}

/**
 * Get all worktrees for the repository and return sorted list
 */
async function getWorktreeList(cwd: string): Promise<string[]> {
	const result = await execGit('worktree list --porcelain', cwd);
	if (!result) {
		return [];
	}

	const worktrees: string[] = [];
	for (const line of result.stdout.split('\n')) {
		if (line.startsWith('worktree ')) {
			worktrees.push(line.substring('worktree '.length));
		}
	}

	// Sort alphabetically for consistent ordering across all worktrees
	worktrees.sort();
	return worktrees;
}

/**
 * Find the index of the current worktree in the sorted worktree list
 */
async function getWorktreeIndex(workspacePath: string): Promise<number> {
	const worktrees = await getWorktreeList(workspacePath);
	if (worktrees.length === 0) {
		return 0;
	}

	const topLevel = await getGitTopLevel(workspacePath);
	if (!topLevel) {
		return 0;
	}

	const resolvedTopLevel = path.resolve(topLevel);
	const index = worktrees.findIndex((wt) => path.resolve(wt) === resolvedTopLevel);

	return index >= 0 ? index : 0;
}

/**
 * Get git information for a workspace path
 */
export async function getGitInfo(workspacePath: string): Promise<GitInfo | null> {
	const gitPath = path.join(workspacePath, '.git');

	if (!fs.existsSync(gitPath)) {
		return null;
	}

	const stat = fs.statSync(gitPath);
	let isWorktree = false;
	let mainWorktreePath: string | undefined;
	let gitDir: string;

	if (stat.isFile()) {
		// This is a worktree - .git is a file pointing to the real git dir
		const content = fs.readFileSync(gitPath, 'utf-8');
		const parsedGitDir = parseGitFile(content);

		if (!parsedGitDir) {
			return null;
		}

		gitDir = path.isAbsolute(parsedGitDir)
			? parsedGitDir
			: path.resolve(workspacePath, parsedGitDir);

		isWorktree = true;

		// gitDir typically: /path/to/main/.git/worktrees/<name>
		// Extract main repo path
		const worktreesMatch = gitDir.match(/^(.+)\/\.git\/worktrees\/.+$/);
		if (worktreesMatch?.[1]) {
			mainWorktreePath = worktreesMatch[1];
		}
	} else {
		// Regular repository - .git is a directory
		gitDir = gitPath;
	}

	// Get remote URL for repository identification
	const remoteUrl = await getRemoteUrl(workspacePath);
	let repoIdentifier: string;

	if (remoteUrl) {
		repoIdentifier = normalizeGitUrl(remoteUrl);
	} else {
		// Fallback to folder name if no remote
		const topLevel = await getGitTopLevel(workspacePath);
		repoIdentifier = path.basename(topLevel ?? workspacePath);
	}

	const worktreeIndex = await getWorktreeIndex(workspacePath);

	return {
		repoIdentifier,
		isWorktree,
		mainWorktreePath,
		gitDir,
		worktreeIndex,
	};
}

/**
 * Check if a path is inside a git repository
 */
export async function isGitRepository(workspacePath: string): Promise<boolean> {
	const result = await execGit('rev-parse --is-inside-work-tree', workspacePath);
	return result?.stdout.trim() === 'true';
}

/**
 * Get git info for a file path by finding the containing git repository.
 * Walks up the directory tree to find the git root.
 */
export async function getGitInfoForFile(filePath: string): Promise<GitInfo | null> {
	// Get the directory containing the file
	const dirPath = fs.statSync(filePath).isDirectory() ? filePath : path.dirname(filePath);

	// Use git to find the repository root from this location
	const result = await execGit('rev-parse --show-toplevel', dirPath);
	if (!result) {
		return null;
	}

	const repoRoot = result.stdout.trim();
	return getGitInfo(repoRoot);
}
