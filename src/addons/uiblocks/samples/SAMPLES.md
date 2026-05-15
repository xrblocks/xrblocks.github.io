# UIBlocks Samples

This directory contains example applications and demonstration scenes for the `uiblocks` SDK, showcasing various UI components, layouts, and interactive behaviors.

## Directory Structure

```text
samples/
├── Sample.ts           # Base class for all samples (initializes UICore, renderer)
├── index.html          # Main entrypoint index dashboard for loading previews
│
├── basic/              # Atomic Component Demonstrations
│   ├── behaviors/      # HeadLeash, Billboard, Manipulation, Anchor overrides
│   ├── cards/          # Basic XR card setup and rendering
│   ├── contents/       # Labels, icons, and text nodes configuration
│   ├── interactions/   # Hover events, selection feedback, click triggers
│   ├── layouts/        # Flexbox alignment, gaps, margins, paddings
│   └── panels/         # Standard UIBoard panel meshes with borders
```

## Running Samples

To build and serve the samples locally:

1. **Start the incremental watch bundle**:

   ```bash
   pnpm run start
   ```

   This compiles the core library and sample entrypoints into the `build/` directory automatically on edits.

2. **Serve the workspace**:
   You can use any local static file server (e.g., `npx serve .` or Live Server) in the repository root and navigate into `samples/index.html` to load individual scenes via the XR simulator correctly.

## Key Concepts

- **`Sample` Base Class**: All scenes extend `Sample` located at `samples/Sample.ts`. It wraps the standard `xrblocks` Script cycle to securely boot the ambient lighting, transparent sorting overrides, and initialize the main `uiCore` node anchor securely.
- **Cards**: High-level rigid groups should mount inside cards (`uiCore.createCard`), while styling UI elements (`UIPanel`, `UIIcon`, `UIImage`, `UIText`) nest inside cards.
