# Design System Component Replacer

A Figma plugin that helps you replace legacy components with new design system components while preserving customizations through intelligent prop mapping.

## Features

- **Component Discovery**: Find all component instances within your selection, including nested components
- **Intelligent Prop Mapping**: Manually map properties from old components to new ones with full control
- **Auto Re-scan After Detach**: Automatically discovers components and text inside detached instances
- **Side-by-Side Preview**: Preview old vs new components before replacing
- **Bulk Text Style Replacement**: Group text nodes by style and color, apply new styles in bulk
- **Saved Mappings**: Save and reuse prop mappings for consistent replacements
- **Skip & Replace Tracking**: Skip components you don't want to replace, track what's been replaced

## Installation

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ds-replace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

4. **Load in Figma**
   - Open Figma Desktop
   - Go to Plugins → Development → Import plugin from manifest
   - Select the `manifest.json` file from this project
   - The plugin is now ready to use!

### Development Mode (Hot Reload)

```bash
npm run watch
```

This will watch for changes and rebuild automatically.

## Usage

### 1. Discover Components

1. Select one or more frames/layers in Figma
2. Open the plugin
3. Click "Discover Components"
4. The plugin will find all component instances and text nodes

### 2. Replace Components

1. Expand a component instance in the list
2. Enter the new component key (you can find this in Figma by right-clicking a component → Copy link → the key is the last part)
3. Map properties:
   - **Old Property**: Shows the current property name and type
   - **New Property**: Enter the corresponding property name in the new component
   - **Value**: Set the value for the new property
4. Click **Preview** to see a side-by-side comparison (optional)
5. Click **Replace** to perform the replacement

### 3. Detach Nested Components

For nested component structures where you only have lower-level components ready:

1. Find a nested instance (marked with "Nested (Level X)")
2. Click **Detach**
3. The plugin will:
   - Detach the instance (converts to Frame/Group)
   - Automatically re-scan for components inside
   - Show newly accessible components in the list
   - Update text groups with text that's now outside components

### 4. Replace Text Styles

1. Switch to the **Text Styles** tab
2. Review grouped text nodes (grouped by style + color)
3. Enter the new style ID for each group
4. Click **Apply** to update all text nodes in the group

### 5. Save and Reuse Mappings

(Coming in future update)
- Save frequently used prop mappings
- Reuse mappings for similar component replacements

## CI/CD Workflow

### GitHub Actions Build

This project includes a GitHub Actions workflow that automatically builds the plugin on every push.

**To use the built plugin on another machine:**

1. **Push your changes**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Download the built plugin**
   - Go to your GitHub repo → **Actions** tab
   - Click the latest workflow run
   - Scroll to **Artifacts** section
   - Download `figma-plugin-latest.zip`

3. **Use the plugin**
   - Extract the zip file
   - In Figma Desktop: Plugins → Development → Import plugin from manifest
   - Navigate to the extracted `figma-plugin/` folder
   - Select `manifest.json`

**Artifact Retention:**
- Commit-specific builds: 30 days
- Latest build: 90 days

## Project Structure

```
ds-replace/
├── manifest.json              # Figma plugin manifest
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── .github/workflows/         # GitHub Actions CI/CD
│   └── build.yml
├── shared/types/              # Shared type definitions
│   ├── component.types.ts
│   ├── messages.types.ts
│   └── textStyle.types.ts
├── src/
│   ├── plugin/                # Plugin backend (Figma API)
│   │   ├── code.ts           # Main entry point
│   │   └── services/         # Core services
│   │       ├── ComponentDiscoveryService.ts
│   │       ├── ComponentReplacementService.ts
│   │       ├── TextNodeService.ts
│   │       ├── StorageService.ts
│   │       └── PreviewService.ts
│   └── ui/                    # React UI
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Root component
│       ├── store/            # Zustand state management
│       ├── hooks/            # React hooks
│       ├── components/       # UI components
│       └── styles/           # CSS styles
└── dist/                      # Build output
    ├── code.js
    └── ui.html
```

## Development

### Available Scripts

- `npm run build` - Build both plugin and UI
- `npm run build:plugin` - Build plugin code only
- `npm run build:ui` - Build UI only
- `npm run watch` - Watch mode for development
- `npm run package` - Create distributable zip package

### Tech Stack

- **TypeScript** - Type-safe development
- **React** - UI framework
- **Zustand** - State management
- **Vite** - UI bundler
- **esbuild** - Plugin code bundler
- **Figma Plugin API** - Component manipulation

## How It Works

### Dual-Context Architecture

The plugin runs in two separate contexts:

1. **Plugin Context (Sandbox)**
   - Has access to Figma API
   - Handles node traversal, component manipulation, and data extraction
   - No DOM access

2. **UI Context (Iframe)**
   - React-based user interface
   - No direct Figma API access
   - Communicates with plugin via `postMessage`

### Key Technical Features

- **swapComponent()**: Uses Figma's intelligent override preservation
- **Auto Re-scan**: Detaching triggers automatic re-discovery of nested content
- **Text Grouping**: Groups by `textStyleId + fillColor` for precise bulk operations
- **Persistent Storage**: Uses `figma.root.setPluginData()` for saved mappings (100KB limit)
- **Preview Generation**: Creates temporary off-screen instances for side-by-side comparison

## Troubleshooting

### "Instance not found" error
- The component instance may have been deleted
- Try re-discovering components

### "New component not found" error
- Check that the component key is correct
- Ensure the new component exists in the current file or is from an enabled library

### Text styles not applying
- Verify the style ID is correct
- Make sure fonts are available in Figma

### Build fails
- Run `npm install` to ensure all dependencies are installed
- Check that Node.js version is 18 or higher

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
