import * as vscode from 'vscode';
import { applyColors, generateColor, getColorConfig, resetColors } from './colors.js';
import { getGitInfo } from './git.js';

/**
 * Get the workspace folder path, if available
 */
function getWorkspacePath(): string | undefined {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	return workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Apply worktree colors to the current workspace
 */
async function applyWorktreeColors(): Promise<{ applied: boolean; message: string }> {
	const workspacePath = getWorkspacePath();
	if (!workspacePath) {
		return { applied: false, message: 'No workspace folder open' };
	}

	const gitInfo = await getGitInfo(workspacePath);
	if (!gitInfo) {
		return { applied: false, message: 'Not a git repository' };
	}

	// Skip coloring for the root/main worktree (index 0)
	// Only color secondary worktrees
	if (gitInfo.worktreeIndex === 0) {
		return { applied: false, message: 'Skipping root worktree (no color applied)' };
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

	const gitInfo = await getGitInfo(workspacePath);
	if (!gitInfo) {
		await vscode.window.showInformationMessage('Not a git repository');
		return;
	}

	const config = getColorConfig();
	const color = generateColor(gitInfo.repoIdentifier, gitInfo.worktreeIndex, config);

	const lines = [
		`Repository: ${gitInfo.repoIdentifier}`,
		`Type: ${gitInfo.isWorktree ? 'Worktree' : 'Main Repository'}`,
		`Worktree Index: ${gitInfo.worktreeIndex}`,
		`Generated Color: ${color}`,
	];

	if (gitInfo.isWorktree && gitInfo.mainWorktreePath) {
		lines.push(`Main Repo Path: ${gitInfo.mainWorktreePath}`);
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
			}
		}
	});

	context.subscriptions.push(configWatcher);
}

export function deactivate(): void {
	// Cleanup if needed
}
