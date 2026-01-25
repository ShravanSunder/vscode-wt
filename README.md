# Worktree Colors

A VS Code extension that automatically assigns colors to workspaces based on the git repository. Git worktrees of the same repo get **related shade variations** (same hue, different lightness), making it easy to distinguish windows when Alt+Tab switching.

## Features

- **Automatic Colors**: Deterministically generates colors based on your git remote URL
- **Worktree Aware**: Worktrees of the same repo share the same hue but have different lightness
- **Customizable**: Configure which UI elements to colorize and adjust color parameters
- **Zero Configuration**: Works out of the box with sensible defaults

## How It Works

1. **Repository Identification**: The extension normalizes your git remote URL to create a unique identifier
2. **Color Generation**: A deterministic hash converts the identifier to a hue (0-360°)
3. **Worktree Detection**: If the workspace is a worktree, it gets a lighter shade based on its index
4. **UI Coloring**: Colors are applied to title bar, activity bar, and status bar

### Example

For a repository at `github.com/user/myproject`:

| Workspace | Type | Index | Lightness |
|-----------|------|-------|-----------|
| ~/projects/myproject | Main | 0 | 35% |
| ~/projects/myproject-feature | Worktree | 1 | 43% |
| ~/projects/myproject-hotfix | Worktree | 2 | 51% |

All three share the **same hue** but different lightness, appearing as "shades of the same color family."

## Commands

- **Worktree Colors: Apply** - Manually apply colors to the current workspace
- **Worktree Colors: Reset** - Remove colors applied by this extension
- **Worktree Colors: Show Info** - Display git/worktree information for the workspace

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `worktreeColors.enabled` | `true` | Auto-apply colors on workspace open |
| `worktreeColors.affectTitleBar` | `true` | Apply color to title bar |
| `worktreeColors.affectActivityBar` | `true` | Apply color to activity bar |
| `worktreeColors.affectStatusBar` | `true` | Apply color to status bar |
| `worktreeColors.saturation` | `50` | Color saturation (10-100) |
| `worktreeColors.baseLightness` | `35` | Base lightness for main worktree (15-60) |
| `worktreeColors.worktreeLightnessStep` | `8` | Lightness increase per worktree (3-15) |

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Lint and format
npm run check
```

## Building

```bash
# Compile for production
npm run vscode:prepublish

# Package as VSIX (requires vsce)
npx vsce package
```

## License

MIT
