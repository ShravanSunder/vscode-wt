import * as vscode from 'vscode';
import {
	applyColors,
	generateColor,
	getColorConfig,
	hasExistingManagedColors,
	resetColors,
} from './colors.js';
import { type GitInfo, getGitInfo, getGitInfoForFile } from './git.js';

type DetectionMode = 'auto' | 'workspaceFileOnly' | 'firstWorkspaceFolder';

interface WorkspaceConfig {
	detectionMode: DetectionMode;
	respectExistingColors: boolean;
}

/**
 * Get workspace configuration for worktree detection
 */
function getWorkspaceConfig(): WorkspaceConfig {
	const config = vscode.workspace.getConfiguration('worktreeColors');
	return {
		detectionMode: config.get<DetectionMode>('detectionMode') ?? 'auto',
		respectExistingColors: config.get<boolean>('respectExistingColors') ?? true,
	};
}

/**
 * Get the workspace folder path, if available
 */
function getWorkspacePath(): string | undefined {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	return workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Get the workspace file path (for multi-root workspaces)
 * Returns undefined for single-folder workspaces
 */
function getWorkspaceFilePath(): string | undefined {
	return vscode.workspace.workspaceFile?.fsPath;
}

/**
 * Detect the appropriate git info based on workspace configuration.
 * For multi-root workspaces, can check if the .code-workspace file is inside a worktree.
 */
async function detectWorktreeGitInfo(wsConfig: WorkspaceConfig): Promise<GitInfo | null> {
	const workspaceFilePath = getWorkspaceFilePath();
	const firstFolderPath = getWorkspacePath();

	// firstWorkspaceFolder: Always use first folder, ignore workspace file
	if (wsConfig.detectionMode === 'firstWorkspaceFolder') {
		return firstFolderPath ? getGitInfo(firstFolderPath) : null;
	}

	// auto or workspaceFileOnly: Check workspace file location first
	if (workspaceFilePath) {
		const workspaceFileGitInfo = await getGitInfoForFile(workspaceFilePath);
		if (workspaceFileGitInfo) {
			return workspaceFileGitInfo;
		}
	}

	// workspaceFileOnly: Don't fall back to folder
	if (wsConfig.detectionMode === 'workspaceFileOnly') {
		return null;
	}

	// auto: Fall back to first folder
	return firstFolderPath ? getGitInfo(firstFolderPath) : null;
}

/**
 * Apply worktree colors to the current workspace
 */
async function applyWorktreeColors(): Promise<{ applied: boolean; message: string }> {
	const workspacePath = getWorkspacePath();
	if (!workspacePath) {
		return { applied: false, message: 'No workspace folder open' };
	}

	const wsConfig = getWorkspaceConfig();

	// Check if we should respect existing colors
	if (wsConfig.respectExistingColors && hasExistingManagedColors()) {
		return { applied: false, message: 'Existing color customizations found (not overriding)' };
	}

	const gitInfo = await detectWorktreeGitInfo(wsConfig);
	if (!gitInfo) {
		return { applied: false, message: 'Not a git repository or workspace file not in worktree' };
	}

	// Skip coloring for the main repository (not a worktree)
	// Only color actual worktrees (where .git is a file, not a directory)
	if (!gitInfo.isWorktree) {
		return { applied: false, message: 'Skipping main repository (no color applied)' };
	}

	const config = getColorConfig();
	const color = generateColor(gitInfo.repoIdentifier, gitInfo.worktreeIndex, config);

	await applyColors(color, config);

	return {
		applied: true,
		message: `Applied color ${color} for worktree (index ${gitInfo.worktreeIndex})`,
	};
}

/**
 * Show information about the current workspace's git/worktree status
 */
async function showWorktreeInfo(): Promise<void> {
	const workspacePath = getWorkspacePath();
	if (!workspacePath) {
		await vscode.window.showInformationMessage('No workspace folder open');
		return;
	}

	const wsConfig = getWorkspaceConfig();
	const gitInfo = await getGitInfo(workspacePath);

	if (!gitInfo) {
		await vscode.window.showInformationMessage(`Not a git repository\nPath: ${workspacePath}`);
		return;
	}

	const config = getColorConfig();
	const color = generateColor(gitInfo.repoIdentifier, gitInfo.worktreeIndex, config);
	const hasExisting = hasExistingManagedColors();

	// Debug: inspect the actual color config
	const workbenchConfig = vscode.workspace.getConfiguration('workbench');
	const inspection = workbenchConfig.inspect<Record<string, string>>('colorCustomizations');
	const wsColors = inspection?.workspaceValue;
	const wsFolderColors = inspection?.workspaceFolderValue;

	const lines = [
		`Repository: ${gitInfo.repoIdentifier}`,
		`Is Worktree: ${gitInfo.isWorktree}`,
		`Generated Color: ${color}`,
		`Has Existing Colors: ${hasExisting}`,
		'',
		'DEBUG:',
		`  workspaceValue: ${wsColors ? JSON.stringify(Object.keys(wsColors)) : 'undefined'}`,
		`  workspaceFolderValue: ${wsFolderColors ? JSON.stringify(Object.keys(wsFolderColors)) : 'undefined'}`,
	];

	// Show why coloring might be skipped
	if (!gitInfo.isWorktree) {
		lines.push('\n[SKIP] Main repo, not a worktree');
	} else if (hasExisting && wsConfig.respectExistingColors) {
		lines.push('\n[SKIP] Existing colors found');
	} else {
		lines.push('\n[OK] Should be colored');
	}

	await vscode.window.showInformationMessage(lines.join('\n'), { modal: true });
}

/**
 * Reset worktree colors in the current workspace
 */
async function resetWorktreeColors(): Promise<void> {
	await resetColors();
	await vscode.window.showInformationMessage('Worktree colors have been reset');
}

export function activate(context: vscode.ExtensionContext): void {
	// Register commands
	const applyCommand = vscode.commands.registerCommand('worktreeColors.applyColor', async () => {
		const result = await applyWorktreeColors();
		await vscode.window.showInformationMessage(result.message);
	});

	const resetCommand = vscode.commands.registerCommand(
		'worktreeColors.resetColor',
		resetWorktreeColors
	);

	const infoCommand = vscode.commands.registerCommand('worktreeColors.showInfo', showWorktreeInfo);

	context.subscriptions.push(applyCommand, resetCommand, infoCommand);

	// Auto-apply on startup if enabled
	const config = vscode.workspace.getConfiguration('worktreeColors');
	const enabled = config.get<boolean>('enabled') ?? true;

	if (enabled) {
		applyWorktreeColors().catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'Unknown error';
			console.error('Failed to apply worktree colors:', message);
		});
	}

	// Listen for configuration changes
	const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('worktreeColors')) {
			const updatedConfig = vscode.workspace.getConfiguration('worktreeColors');
			const isEnabled = updatedConfig.get<boolean>('enabled') ?? true;

			if (isEnabled) {
				applyWorktreeColors().catch((error: unknown) => {
					const message = error instanceof Error ? error.message : 'Unknown error';
					console.error('Failed to apply worktree colors on config change:', message);
				});
			} else {
				// User disabled the extension - clean up colors
				resetColors().catch((error: unknown) => {
					const message = error instanceof Error ? error.message : 'Unknown error';
					console.error('Failed to reset worktree colors:', message);
				});
			}
		}
	});

	context.subscriptions.push(configWatcher);
}

export function deactivate(): Thenable<void> | undefined {
	// Clean up colors on deactivation to leave workspace settings clean
	return resetColors();
}
