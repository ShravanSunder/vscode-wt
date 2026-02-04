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
 * Store original color values before we modify them
 * This allows us to restore them when the extension deactivates
 */
let originalColors: Record<string, string | undefined> | null = null;
let colorsApplied = false;

/**
 * Save the original color values for keys we're about to modify
 */
function saveOriginalColors(): void {
	if (originalColors !== null) {
		// Already saved
		return;
	}

	const workbenchConfig = vscode.workspace.getConfiguration('workbench');
	const existingColors = workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};

	originalColors = {};
	for (const key of MANAGED_COLOR_KEYS) {
		// Store original value (or undefined if not set)
		originalColors[key] = existingColors[key];
	}
}

/**
 * Apply colors to the workspace configuration (transient - will be cleaned up on deactivation)
 */
export async function applyColors(baseColor: string, config: ColorConfig): Promise<void> {
	// Save original colors before first modification
	saveOriginalColors();

	const colors = buildColorCustomizations(baseColor, config);
	const workbenchConfig = vscode.workspace.getConfiguration('workbench');

	const existingColors = workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};
	const mergedColors = { ...existingColors, ...colors };

	await workbenchConfig.update(
		'colorCustomizations',
		mergedColors,
		vscode.ConfigurationTarget.Workspace
	);

	colorsApplied = true;
}

/**
 * Reset colors - restores original values that existed before extension modified them
 * This is called on deactivation to leave workspace settings clean
 */
export async function resetColors(): Promise<void> {
	if (!colorsApplied) {
		// Nothing to reset
		return;
	}

	const workbenchConfig = vscode.workspace.getConfiguration('workbench');
	const existingColors = workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};

	// Start with current colors, minus our managed keys
	const restoredColors: Record<string, string> = {};

	for (const [key, value] of Object.entries(existingColors)) {
		if (!MANAGED_COLOR_KEYS.includes(key as (typeof MANAGED_COLOR_KEYS)[number])) {
			// Keep colors we don't manage
			restoredColors[key] = value;
		}
	}

	// Restore original values for keys we modified
	if (originalColors) {
		for (const [key, value] of Object.entries(originalColors)) {
			if (value !== undefined) {
				// Restore original value
				restoredColors[key] = value;
			}
			// If original was undefined, we don't add it back (leaving it removed)
		}
	}

	const newValue = Object.keys(restoredColors).length > 0 ? restoredColors : undefined;

	await workbenchConfig.update(
		'colorCustomizations',
		newValue,
		vscode.ConfigurationTarget.Workspace
	);

	colorsApplied = false;
	originalColors = null;
}

/**
 * Check if colors have been applied by this extension
 */
export function hasAppliedColors(): boolean {
	return colorsApplied;
}

/**
 * Check if any of the managed color keys already have values set by the user
 * (not by this extension). This is used to respect existing color customizations.
 */
export function hasExistingManagedColors(): boolean {
	// If we've already applied colors, those are ours - don't count them
	if (colorsApplied) {
		return false;
	}

	const workbenchConfig = vscode.workspace.getConfiguration('workbench');
	const existingColors = workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};

	// Check if any of our managed keys have values
	return MANAGED_COLOR_KEYS.some((key) => existingColors[key] !== undefined);
}

/**
 * Get color configuration from VS Code settings
 */
export function getColorConfig(): ColorConfig {
	const config = vscode.workspace.getConfiguration('worktreeColors');

	return {
		saturation: config.get<number>('saturation') ?? 15,
		baseLightness: config.get<number>('baseLightness') ?? 20,
		worktreeLightnessStep: config.get<number>('worktreeLightnessStep') ?? 4,
		affectTitleBar: config.get<boolean>('affectTitleBar') ?? true,
		affectActivityBar: config.get<boolean>('affectActivityBar') ?? true,
		affectStatusBar: config.get<boolean>('affectStatusBar') ?? true,
	};
}
