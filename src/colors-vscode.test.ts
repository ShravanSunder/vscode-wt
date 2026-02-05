import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock vscode module
const mockInspect = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock('vscode', () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: mockGet,
			inspect: mockInspect,
			update: mockUpdate,
		})),
	},
	ConfigurationTarget: {
		Workspace: 2,
	},
}));

// Import after mocking
import { MANAGED_COLOR_KEYS, hasExistingManagedColors } from './colors.js';

describe('hasExistingManagedColors', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return false when no workspace colors exist', () => {
		mockInspect.mockReturnValue({
			workspaceValue: undefined,
			globalValue: { 'titleBar.activeBackground': '#ff0000' }, // User has global colors
		});

		const result = hasExistingManagedColors();

		expect(result).toBe(false);
		expect(mockInspect).toHaveBeenCalledWith('colorCustomizations');
	});

	it('should return false when workspace has colors but not managed keys', () => {
		mockInspect.mockReturnValue({
			workspaceValue: {
				'editor.background': '#1a1a1a',
				'editor.foreground': '#ffffff',
			},
		});

		const result = hasExistingManagedColors();

		expect(result).toBe(false);
	});

	it('should return true when workspace has managed color keys', () => {
		mockInspect.mockReturnValue({
			workspaceValue: {
				'titleBar.activeBackground': '#ff0000',
			},
		});

		const result = hasExistingManagedColors();

		expect(result).toBe(true);
	});

	it('should return true when workspace has any managed key', () => {
		// Test each managed key
		for (const key of MANAGED_COLOR_KEYS) {
			vi.clearAllMocks();
			mockInspect.mockReturnValue({
				workspaceValue: {
					[key]: '#123456',
				},
			});

			const result = hasExistingManagedColors();

			expect(result).toBe(true);
		}
	});

	it('should ignore global/user settings and only check workspace', () => {
		mockInspect.mockReturnValue({
			globalValue: {
				'titleBar.activeBackground': '#ff0000',
				'activityBar.background': '#00ff00',
				'statusBar.background': '#0000ff',
			},
			workspaceValue: undefined, // No workspace colors
		});

		const result = hasExistingManagedColors();

		// Should return false because we only check workspace level
		expect(result).toBe(false);
	});

	it('should return false when workspaceValue is empty object', () => {
		mockInspect.mockReturnValue({
			workspaceValue: {},
		});

		const result = hasExistingManagedColors();

		expect(result).toBe(false);
	});
});

describe('MANAGED_COLOR_KEYS', () => {
	it('should contain expected title bar keys', () => {
		expect(MANAGED_COLOR_KEYS).toContain('titleBar.activeBackground');
		expect(MANAGED_COLOR_KEYS).toContain('titleBar.activeForeground');
		expect(MANAGED_COLOR_KEYS).toContain('titleBar.inactiveBackground');
		expect(MANAGED_COLOR_KEYS).toContain('titleBar.inactiveForeground');
	});

	it('should contain expected activity bar keys', () => {
		expect(MANAGED_COLOR_KEYS).toContain('activityBar.background');
		expect(MANAGED_COLOR_KEYS).toContain('activityBar.foreground');
		expect(MANAGED_COLOR_KEYS).toContain('activityBar.inactiveForeground');
	});

	it('should contain expected status bar keys', () => {
		expect(MANAGED_COLOR_KEYS).toContain('statusBar.background');
		expect(MANAGED_COLOR_KEYS).toContain('statusBar.foreground');
	});
});
