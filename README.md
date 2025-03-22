# Map Editor 3000

A robust tile-based map editor built with HTML, CSS, and JavaScript, using Golden Layout for the UI framework.

## Features

- Define custom tile size in pixels
- Define custom map dimensions (width and height)
- Multiple layers (ground, objects, overlay)
- Tool selection: Map selection, pencil, fill, shape tools
- Undo/redo functionality
- Tileset management with multi-tile selection
- Extend tilesets by uploading additional images
- Mouse interactions:
  - Left click: Draw/select
  - Right click: Erase (in pencil mode) or context menu (in selection mode)
  - Middle click: Pan the map/tileset view
  - Mouse wheel: Zoom in/out
- Export/import map data as JSON

## Getting Started

1. Open `index.html` in your browser
2. Upload a tileset image using the "Upload Tileset" button
3. Use the toolbar to select tools and configure map properties
4. Create your map by selecting tiles and drawing on the map canvas

## Usage

### Tools

- **Selection Tool**: Select areas of the map. Use right-click to open context menu with options to copy, delete, flip, and paste.
- **Pencil Tool**: Draw tiles on the map. Right-click to erase.
- **Fill Tool**: Fill connected areas with the selected tile.
- **Shape Tool**: Draw rectangular shapes (filled or outlined).

### Layers

The editor supports multiple layers that can be toggled on/off:
- Ground (bottom layer)
- Objects (middle layer)
- Overlay (top layer)

### Tilesets

- Upload tileset images to use as sources for your map tiles
- When uploading a new tileset, it extends your available tiles
- Select one or multiple tiles by clicking and dragging in the tileset panel

### Map Navigation

- Pan: Middle-click and drag
- Zoom: Mouse wheel or zoom controls
