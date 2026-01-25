import * as vscode from 'vscode';

export interface ColorConfig {
	saturation: number;
	baseLightness: number;
	worktreeLightnessStep: number;
	affectTitleBar: boolean;
	affectActivityBar: boolean;
	affectStatusBar: boolean;
}

/**
 * Deterministically hash a string to a hue value (0-360)
 */
export function stringToHue(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash) % 360;
}

/**
 * Convert HSL values to a hex color string
 */
export function hslToHex(h: number, s: number, l: number): string {
	const sNorm = s / 100;
	const lNorm = l / 100;

	const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = lNorm - c / 2;

	let r = 0;
	let g = 0;
	let b = 0;

	if (h >= 0 && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h >= 60 && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h >= 120 && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h >= 180 && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h >= 240 && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}

	const toHex = (n: number): string => {
		const hex = Math.round((n + m) * 255).toString(16);
		return hex.length === 1 ? `0${hex}` : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get a contrasting foreground color (light or dark) based on background luminance
 */
export function getContrastingForeground(hexColor: string): string {
	const hex = hexColor.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	// Relative luminance calculation
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	return luminance > 0.5 ? '#15202b' : '#e0e0e0';
}

/**
 * Add alpha transparency to a hex color
 */
export function addAlpha(hexColor: string, alpha: number): string {
	const hex = hexColor.replace('#', '');
	const alphaHex = Math.round(alpha * 255)
		.toString(16)
		.padStart(2, '0');
	return `#${hex}${alphaHex}`;
}

/**
 * Generate a color based on repository identifier and worktree index
 */
export function generateColor(
	repoIdentifier: string,
	worktreeIndex: number,
	config: ColorConfig
): string {
	const hue = stringToHue(repoIdentifier);
	const { saturation, baseLightness, worktreeLightnessStep } = config;

	// Main worktree (index 0) gets base lightness
	// Each subsequent worktree gets progressively lighter
	const lightness = Math.min(baseLightness + worktreeIndex * worktreeLightnessStep, 65);

	return hslToHex(hue, saturation, lightness);
}

/**
 * Build the color customizations object based on configuration
 */
export function buildColorCustomizations(
	baseColor: string,
	config: ColorConfig
): Record<string, string> {
	const foreground = getContrastingForeground(baseColor);
	const colors: Record<string, string> = {};

	if (config.affectTitleBar) {
		colors['titleBar.activeBackground'] = baseColor;
		colors['titleBar.activeForeground'] = foreground;
		colors['titleBar.inactiveBackground'] = addAlpha(baseColor, 0.6);
		colors['titleBar.inactiveForeground'] = addAlpha(foreground, 0.6);
	}

	if (config.affectActivityBar) {
		colors['activityBar.background'] = baseColor;
		colors['activityBar.foreground'] = foreground;
		colors['activityBar.inactiveForeground'] = addAlpha(foreground, 0.6);
	}

	if (config.affectStatusBar) {
		colors['statusBar.background'] = baseColor;
		colors['statusBar.foreground'] = foreground;
	}

	return colors;
}

/**
 * The color keys that this extension manages
 */
export const MANAGED_COLOR_KEYS = [
	'titleBar.activeBackground',
	'titleBar.activeForeground',
	'titleBar.inactiveBackground',
	'titleBar.inactiveForeground',
	'activityBar.background',
	'activityBar.foreground',
	'activityBar.inactiveForeground',
	'statusBar.background',
	'statusBar.foreground',
] as const;

/**
 * Apply colors to the workspace configuration
 */
export async function applyColors(baseColor: string, config: ColorConfig): Promise<void> {
	const colors = buildColorCustomizations(baseColor, config);
	const workbenchConfig = vscode.workspace.getConfiguration('workbench');

	const existingColors =
		workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};
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
	const existingColors =
		workbenchConfig.get<Record<string, string>>('colorCustomizations') ?? {};

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
		saturation: config.get<number>('saturation') ?? 50,
		baseLightness: config.get<number>('baseLightness') ?? 35,
		worktreeLightnessStep: config.get<number>('worktreeLightnessStep') ?? 8,
		affectTitleBar: config.get<boolean>('affectTitleBar') ?? true,
		affectActivityBar: config.get<boolean>('affectActivityBar') ?? true,
		affectStatusBar: config.get<boolean>('affectStatusBar') ?? true,
	};
}
