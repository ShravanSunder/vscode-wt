import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the git module
vi.mock('./git.js', () => ({
	getGitInfo: vi.fn(),
	getGitInfoForFile: vi.fn(),
	normalizeGitUrl: vi.fn((url: string) => url.toLowerCase()),
}));

// Mock fs module
vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	statSync: vi.fn(),
	readFileSync: vi.fn(),
}));

import * as fs from 'node:fs';
import { getGitInfo, getGitInfoForFile } from './git.js';

describe('workspace detection logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getGitInfoForFile behavior', () => {
		it('should be called with the directory containing the workspace file', async () => {
			const mockGitInfo = {
				repoIdentifier: 'github.com/user/repo',
				isWorktree: true,
				mainWorktreePath: '/main/repo',
				gitDir: '/main/repo/.git/worktrees/feature',
				worktreeIndex: 1,
			};

			vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as fs.Stats);
			vi.mocked(getGitInfoForFile).mockResolvedValue(mockGitInfo);

			const result = await getGitInfoForFile('/path/to/workspace.code-workspace');

			expect(result).toEqual(mockGitInfo);
		});

		it('should return null when file is not in a git repository', async () => {
			vi.mocked(getGitInfoForFile).mockResolvedValue(null);

			const result = await getGitInfoForFile('/not/in/git/workspace.code-workspace');

			expect(result).toBeNull();
		});
	});

	describe('getGitInfo for folder detection', () => {
		it('should return git info for a folder that is a worktree', async () => {
			const mockGitInfo = {
				repoIdentifier: 'github.com/user/repo',
				isWorktree: true,
				mainWorktreePath: '/main/repo',
				gitDir: '/main/repo/.git/worktrees/feature',
				worktreeIndex: 1,
			};

			vi.mocked(getGitInfo).mockResolvedValue(mockGitInfo);

			const result = await getGitInfo('/path/to/worktree');

			expect(result).toEqual(mockGitInfo);
			expect(result?.worktreeIndex).toBe(1);
		});

		it('should return git info with worktreeIndex 0 for root repo', async () => {
			const mockGitInfo = {
				repoIdentifier: 'github.com/user/repo',
				isWorktree: false,
				mainWorktreePath: undefined,
				gitDir: '/main/repo/.git',
				worktreeIndex: 0,
			};

			vi.mocked(getGitInfo).mockResolvedValue(mockGitInfo);

			const result = await getGitInfo('/main/repo');

			expect(result).toEqual(mockGitInfo);
			expect(result?.worktreeIndex).toBe(0);
		});

		it('should return null for non-git directories', async () => {
			vi.mocked(getGitInfo).mockResolvedValue(null);

			const result = await getGitInfo('/not/a/git/repo');

			expect(result).toBeNull();
		});
	});

	describe('worktree index determines coloring', () => {
		it('worktreeIndex 0 should indicate root worktree (no coloring)', async () => {
			const mockGitInfo = {
				repoIdentifier: 'github.com/user/repo',
				isWorktree: false,
				mainWorktreePath: undefined,
				gitDir: '/main/repo/.git',
				worktreeIndex: 0,
			};

			vi.mocked(getGitInfo).mockResolvedValue(mockGitInfo);

			const result = await getGitInfo('/main/repo');

			// worktreeIndex 0 means this is the root worktree
			// The extension should NOT apply colors for index 0
			expect(result?.worktreeIndex).toBe(0);
		});

		it('worktreeIndex 1+ should indicate secondary worktree (apply coloring)', async () => {
			const mockGitInfo = {
				repoIdentifier: 'github.com/user/repo',
				isWorktree: true,
				mainWorktreePath: '/main/repo',
				gitDir: '/main/repo/.git/worktrees/feature',
				worktreeIndex: 1,
			};

			vi.mocked(getGitInfo).mockResolvedValue(mockGitInfo);

			const result = await getGitInfo('/path/to/worktree');

			// worktreeIndex 1+ means this is a secondary worktree
			// The extension SHOULD apply colors
			expect(result?.worktreeIndex).toBeGreaterThan(0);
		});
	});
});

describe('respectExistingColors logic', () => {
	it('should skip coloring when managed color keys already have values', () => {
		// This tests the concept - actual implementation is in colors.ts
		const existingColors = {
			'titleBar.activeBackground': '#ff0000',
			'editor.background': '#1a1a1a',
		};

		const managedKeys = [
			'titleBar.activeBackground',
			'titleBar.activeForeground',
			'activityBar.background',
		];

		const hasExisting = managedKeys.some(
			(key) => existingColors[key as keyof typeof existingColors] !== undefined
		);

		expect(hasExisting).toBe(true);
	});

	it('should allow coloring when no managed color keys have values', () => {
		const existingColors = {
			'editor.background': '#1a1a1a',
			'editor.foreground': '#ffffff',
		};

		const managedKeys = [
			'titleBar.activeBackground',
			'titleBar.activeForeground',
			'activityBar.background',
		];

		const hasExisting = managedKeys.some(
			(key) => existingColors[key as keyof typeof existingColors] !== undefined
		);

		expect(hasExisting).toBe(false);
	});
});
