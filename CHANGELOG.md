# Changelog

All notable changes to "Worktree Colors" will be documented in this file.

## [0.4.0] - 2025-02-04

### Added

- **Multi-root workspace support**: For workspaces with multiple folders, the extension now checks if the `.code-workspace` file is inside a worktree first
- **New setting `detectionMode`**: Controls worktree detection in multi-root workspaces
  - `"auto"` (default): Check workspace file location first, fall back to first folder
  - `"workspaceFileOnly"`: Only color if workspace file is inside a worktree
  - `"firstFolderOnly"`: Always use first workspace folder
- **New setting `respectExistingColors`**: When enabled (default), the extension won't override existing color customizations set by the user

### Changed

- Improved workspace detection logic for better multi-root workspace handling

## [0.3.0] - 2025-01-25

### Changed

- **Transient colors**: Colors are now applied dynamically and cleaned up on extension deactivation
- Colors no longer persist to `.vscode/settings.json` after closing VS Code
- Original color customizations are preserved and restored when extension deactivates

### Fixed

- Disabling extension via settings now properly removes applied colors

## [0.2.0] - 2025-01-25

### Changed

- Root worktree (index 0) is no longer colored - only secondary worktrees get colors
- Reduced default saturation from 50 to 30 for subtler colors
- Reduced default base lightness from 35 to 25 for better dark mode compatibility
- Reduced lightness step from 8 to 5 for more gradual shade variations

## [0.1.0] - 2025-01-25

### Added

- Automatic color assignment based on git remote URL hash
- Git worktree detection with shade variations (same hue, different lightness)
- Configurable UI elements: title bar, activity bar, status bar
- Configurable color parameters: saturation, base lightness, lightness step
- Commands:
  - `Worktree Colors: Apply` - Manually apply colors
  - `Worktree Colors: Reset` - Remove applied colors
  - `Worktree Colors: Show Info` - Display workspace git/color info
- Auto-apply on workspace open (configurable)
