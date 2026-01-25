/**
 * Pure color utility functions that don't depend on VS Code
 */

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
 * Linearize an sRGB color component for luminance calculation
 */
function linearize(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/**
 * Get a contrasting foreground color (light or dark) based on background luminance
 * Uses WCAG 2.0 relative luminance calculation for better accessibility
 */
export function getContrastingForeground(hexColor: string): string {
	const hex = hexColor.replace('#', '');
	const r = Number.parseInt(hex.substring(0, 2), 16);
	const g = Number.parseInt(hex.substring(2, 4), 16);
	const b = Number.parseInt(hex.substring(4, 6), 16);

	// WCAG 2.0 relative luminance calculation
	const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);

	// Threshold of 0.179 is where contrast against black and white is equal
	return luminance > 0.179 ? '#15202b' : '#e0e0e0';
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
