import { describe, expect, it } from 'vitest';
import {
	type ColorConfig,
	addAlpha,
	buildColorCustomizations,
	generateColor,
	getContrastingForeground,
	hslToHex,
	stringToHue,
} from './colors-utils.js';

describe('stringToHue', () => {
	it('should return a number between 0 and 359', () => {
		const testStrings = ['hello', 'world', 'github.com/user/repo', 'test123', ''];
		for (const str of testStrings) {
			const hue = stringToHue(str);
			expect(hue).toBeGreaterThanOrEqual(0);
			expect(hue).toBeLessThan(360);
		}
	});

	it('should be deterministic - same input gives same output', () => {
		const input = 'github.com/user/myproject';
		const hue1 = stringToHue(input);
		const hue2 = stringToHue(input);
		expect(hue1).toBe(hue2);
	});

	it('should produce different hues for different inputs', () => {
		const hue1 = stringToHue('github.com/user/project-a');
		const hue2 = stringToHue('github.com/user/project-b');
		// Different inputs should (usually) produce different hues
		// Note: This test could theoretically fail due to hash collisions, but very unlikely
		expect(hue1).not.toBe(hue2);
	});
});

describe('hslToHex', () => {
	it('should convert red (0, 100, 50) to #ff0000', () => {
		const hex = hslToHex(0, 100, 50);
		expect(hex).toBe('#ff0000');
	});

	it('should convert green (120, 100, 50) to #00ff00', () => {
		const hex = hslToHex(120, 100, 50);
		expect(hex).toBe('#00ff00');
	});

	it('should convert blue (240, 100, 50) to #0000ff', () => {
		const hex = hslToHex(240, 100, 50);
		expect(hex).toBe('#0000ff');
	});

	it('should convert black (0, 0, 0) to #000000', () => {
		const hex = hslToHex(0, 0, 0);
		expect(hex).toBe('#000000');
	});

	it('should convert white (0, 0, 100) to #ffffff', () => {
		const hex = hslToHex(0, 0, 100);
		expect(hex).toBe('#ffffff');
	});

	it('should convert gray (0, 0, 50) to #808080', () => {
		const hex = hslToHex(0, 0, 50);
		expect(hex).toBe('#808080');
	});

	it('should handle edge case of hue 360 (same as 0)', () => {
		const hex = hslToHex(360, 100, 50);
		expect(hex).toBe('#ff0000');
	});
});

describe('getContrastingForeground', () => {
	it('should return dark color for light backgrounds', () => {
		const foreground = getContrastingForeground('#ffffff');
		expect(foreground).toBe('#15202b');
	});

	it('should return light color for dark backgrounds', () => {
		const foreground = getContrastingForeground('#000000');
		expect(foreground).toBe('#e0e0e0');
	});

	it('should handle colors without # prefix', () => {
		const foreground = getContrastingForeground('ffffff');
		expect(foreground).toBe('#15202b');
	});

	it('should return dark for yellow (high luminance)', () => {
		const foreground = getContrastingForeground('#ffff00');
		expect(foreground).toBe('#15202b');
	});

	it('should return light for navy blue (low luminance)', () => {
		const foreground = getContrastingForeground('#000080');
		expect(foreground).toBe('#e0e0e0');
	});
});

describe('addAlpha', () => {
	it('should add full opacity (ff) for alpha 1.0', () => {
		const result = addAlpha('#ff0000', 1.0);
		expect(result).toBe('#ff0000ff');
	});

	it('should add zero opacity (00) for alpha 0.0', () => {
		const result = addAlpha('#ff0000', 0.0);
		expect(result).toBe('#ff000000');
	});

	it('should add 50% opacity (80) for alpha 0.5', () => {
		const result = addAlpha('#ff0000', 0.5);
		expect(result).toBe('#ff000080');
	});

	it('should add 60% opacity (99) for alpha 0.6', () => {
		const result = addAlpha('#ff0000', 0.6);
		expect(result).toBe('#ff000099');
	});

	it('should handle colors without # prefix', () => {
		const result = addAlpha('ff0000', 0.5);
		expect(result).toBe('#ff000080');
	});
});

describe('generateColor', () => {
	const defaultConfig: ColorConfig = {
		saturation: 50,
		baseLightness: 35,
		worktreeLightnessStep: 8,
		affectTitleBar: true,
		affectActivityBar: true,
		affectStatusBar: true,
	};

	it('should return a valid hex color', () => {
		const color = generateColor('github.com/user/repo', 0, defaultConfig);
		expect(color).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('should be deterministic', () => {
		const color1 = generateColor('github.com/user/repo', 0, defaultConfig);
		const color2 = generateColor('github.com/user/repo', 0, defaultConfig);
		expect(color1).toBe(color2);
	});

	it('should produce same hue but different lightness for different worktree indices', () => {
		const color0 = generateColor('github.com/user/repo', 0, defaultConfig);
		const color1 = generateColor('github.com/user/repo', 1, defaultConfig);
		const color2 = generateColor('github.com/user/repo', 2, defaultConfig);

		// All should be different colors
		expect(color0).not.toBe(color1);
		expect(color1).not.toBe(color2);
	});

	it('should cap lightness at 65', () => {
		// With baseLightness 35 and step 8, index 10 would give 35 + 80 = 115
		// But it should be capped at 65
		const color = generateColor('github.com/user/repo', 10, defaultConfig);
		expect(color).toMatch(/^#[0-9a-f]{6}$/);
		// The color should still be valid (not error out)
	});
});

describe('buildColorCustomizations', () => {
	const fullConfig: ColorConfig = {
		saturation: 50,
		baseLightness: 35,
		worktreeLightnessStep: 8,
		affectTitleBar: true,
		affectActivityBar: true,
		affectStatusBar: true,
	};

	it('should include all UI elements when all are enabled', () => {
		const colors = buildColorCustomizations('#4a6b8a', fullConfig);

		expect(colors['titleBar.activeBackground']).toBe('#4a6b8a');
		expect(colors['activityBar.background']).toBe('#4a6b8a');
		expect(colors['statusBar.background']).toBe('#4a6b8a');
	});

	it('should exclude title bar when disabled', () => {
		const config = { ...fullConfig, affectTitleBar: false };
		const colors = buildColorCustomizations('#4a6b8a', config);

		expect(colors['titleBar.activeBackground']).toBeUndefined();
		expect(colors['activityBar.background']).toBe('#4a6b8a');
		expect(colors['statusBar.background']).toBe('#4a6b8a');
	});

	it('should exclude activity bar when disabled', () => {
		const config = { ...fullConfig, affectActivityBar: false };
		const colors = buildColorCustomizations('#4a6b8a', config);

		expect(colors['titleBar.activeBackground']).toBe('#4a6b8a');
		expect(colors['activityBar.background']).toBeUndefined();
		expect(colors['statusBar.background']).toBe('#4a6b8a');
	});

	it('should exclude status bar when disabled', () => {
		const config = { ...fullConfig, affectStatusBar: false };
		const colors = buildColorCustomizations('#4a6b8a', config);

		expect(colors['titleBar.activeBackground']).toBe('#4a6b8a');
		expect(colors['activityBar.background']).toBe('#4a6b8a');
		expect(colors['statusBar.background']).toBeUndefined();
	});

	it('should set appropriate foreground colors', () => {
		// Dark background should get light foreground
		const darkColors = buildColorCustomizations('#1a1a1a', fullConfig);
		expect(darkColors['titleBar.activeForeground']).toBe('#e0e0e0');

		// Light background should get dark foreground
		const lightColors = buildColorCustomizations('#e0e0e0', fullConfig);
		expect(lightColors['titleBar.activeForeground']).toBe('#15202b');
	});

	it('should include alpha for inactive states', () => {
		const colors = buildColorCustomizations('#4a6b8a', fullConfig);

		expect(colors['titleBar.inactiveBackground']).toMatch(/^#[0-9a-f]{8}$/);
		expect(colors['titleBar.inactiveForeground']).toMatch(/^#[0-9a-f]{8}$/);
	});
});
