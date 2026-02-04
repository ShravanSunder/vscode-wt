import * as vscode from 'vscode';
import { type ColorConfig, MANAGED_COLOR_KEYS, buildColorCustomizations } from './colors-utils.js';

// Re-export pure functions for use elsewhere
export {
	type ColorConfig,
	MANAGED_COLOR_KEYS,
	addAlpha,
	buildColorCustomizations,
	generateColor,
	getContrastingForeground,
	hslToHex,
	stringToHue,
} from './colors-utils.js';

/**
 * Apply colors to the workspace configuration
 */
export async function applyColors(baseColor: string, config: ColorConfig): Promise<void> {
	const colors = buildColorCustomizations(baseColor, config);
	const workbenchConfig = vscode.workspace.getConfiguration('workbench');

	const existingColors = workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};
	const mergedColors = { ...existingColors, ...colors };

	await workbenchConfig.update(
		'colorCustomizations',
		mergedColors,
		vscode.ConfigurationTarget.Workspace
	);
}

/**
 * Reset (remove) the colors this extension manages from workspace configuration
 */
export async function resetColors(): Promise<void> {
	const workbenchConfig = vscode.workspace.getConfiguration('workbench');
	const existingColors = workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};

	const filteredColors = Object.fromEntries(
		Object.entries(existingColors).filter(
			([key]) => !MANAGED_COLOR_KEYS.includes(key as (typeof MANAGED_COLOR_KEYS)[number])
		)
	);

	const newValue = Object.keys(filteredColors).length > 0 ? filteredColors : undefined;

	await workbenchConfig.update(
		'colorCustomizations',
		newValue,
		vscode.ConfigurationTarget.Workspace
	);
}

/**
 * Get color configuration from VS Code settings
 */
export function getColorConfig(): ColorConfig {
	const config = vscode.workspace.getConfiguration('worktreeColors');

	return {
		saturation: config.get<number>('saturation') ?? 30,
		baseLightness: config.get<number>('baseLightness') ?? 25,
		worktreeLightnessStep: config.get<number>('worktreeLightnessStep') ?? 5,
		affectTitleBar: config.get<boolean>('affectTitleBar') ?? true,
		affectActivityBar: config.get<boolean>('affectActivityBar') ?? true,
		affectStatusBar: config.get<boolean>('affectStatusBar') ?? true,
	};
}
