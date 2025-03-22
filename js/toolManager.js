export class ToolManager {
    constructor(mapEditor, tilesetManager, layerManager, undoRedoManager, config) {
        this.mapEditor = mapEditor;
        this.tilesetManager = tilesetManager;
        this.layerManager = layerManager;
        this.undoRedoManager = undoRedoManager;
        this.config = config;
        
        this.currentTool = 'pencil';
        this.isDrawing = false;
        this.lastTileX = -1;
        this.lastTileY = -1;
        
        // Selection tool state
        this.selection = {
            active: false,
            startX: 0,
            startY: 0,
            width: 0,
            height: 0,
            content: null
        };
        
        // Shape tool state
        this.shapeDraw = {
            active: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            filled: true
        };
        
        // Context menu
        this.contextMenu = $('<div class="context-menu"></div>');
        $('body').append(this.contextMenu);
        
        // Initialize the tools
        this.initTools();
        
        // Update the UI
        this.updateToolButtons();
    }
    
    initTools() {
        // Create fill pattern canvas for fill bucket tool
        this.fillPatternCanvas = document.createElement('canvas');
        this.fillPatternCtx = this.fillPatternCanvas.getContext('2d');
    }
    
    setTool(toolName) {
        this.currentTool = toolName;
        this.updateToolButtons();
        this.clearSelections();
    }
    
    updateToolButtons() {
        // Remove active class from all tool buttons
        $('.tool-btn').removeClass('active');
        
        // Add active class to current tool button
        switch(this.currentTool) {
            case 'select':
                $('#selectTool').addClass('active');
                break;
            case 'pencil':
                $('#pencilTool').addClass('active');
                break;
            case 'fill':
                $('#fillTool').addClass('active');
                break;
            case 'shape':
                $('#shapeTool').addClass('active');
                break;
        }
    }
    
    clearSelections() {
        // Clear cursor selection
        this.mapEditor.clearCursor();
        
        // Clear shape drawing state
        this.shapeDraw.active = false;
        
        // Clear selection
        this.selection.active = false;
        
        // Hide context menu
        this.hideContextMenu();
    }
    
    handleMouseDown(x, y, event) {
        if (!this.mapEditor.isInBounds(x, y)) return;
        
        const currentLayerId = this.layerManager.getCurrentLayerId();
        
        switch(this.currentTool) {
            case 'select':
                this.handleSelectToolDown(x, y);
                break;
                
            case 'pencil':
                this.isDrawing = true;
                this.lastTileX = x;
                this.lastTileY = y;
                
                // Get selected tile and place it
                const selectedTile = this.tilesetManager.getSelectedTile();
                if (selectedTile) {
                    // Start recording changes for undo
                    this.undoRedoManager.beginAction();
                    
                    // Place the tile and record old tile for undo
                    const oldTile = this.mapEditor.setTile(currentLayerId, x, y, selectedTile);
                    this.undoRedoManager.recordTileChange(currentLayerId, x, y, oldTile, selectedTile);
                    
                    // End recording changes
                    this.undoRedoManager.endAction();
                }
                break;
                
            case 'fill':
                this.handleFillTool(x, y);
                break;
                
            case 'shape':
                this.handleShapeToolDown(x, y);
                break;
        }
    }
    
    handleMouseMove(x, y, event) {
        if (!this.mapEditor.isInBounds(x, y)) return;
        
        const currentLayerId = this.layerManager.getCurrentLayerId();
        
        switch(this.currentTool) {
            case 'select':
                if (this.selection.active && !this.selection.content) {
                    // Update selection size
                    this.updateSelectionSize(x, y);
                } else {
                    // Show cursor
                    this.mapEditor.drawCursor(x, y);
                }
                break;
                
            case 'pencil':
                if (this.isDrawing) {
                    if (x !== this.lastTileX || y !== this.lastTileY) {
                        const selectedTile = this.tilesetManager.getSelectedTile();
                        if (selectedTile) {
                            // Draw line from last position to current position
                            const points = this.getLinePoints(this.lastTileX, this.lastTileY, x, y);
                            
                            // Start recording changes for undo
                            this.undoRedoManager.beginAction();
                            
                            for (const point of points) {
                                // Place the tile and record old tile for undo
                                const oldTile = this.mapEditor.setTile(currentLayerId, point.x, point.y, selectedTile);
                                this.undoRedoManager.recordTileChange(currentLayerId, point.x, point.y, oldTile, selectedTile);
                            }
                            
                            // End recording changes
                            this.undoRedoManager.endAction();
                            
                            this.lastTileX = x;
                            this.lastTileY = y;
                        }
                    }
                } else {
                    // Show cursor for single tile
                    const selectedTile = this.tilesetManager.getSelectedTile();
                    if (selectedTile) {
                        const width = selectedTile.sWidth / this.config.tileSize;
                        const height = selectedTile.sHeight / this.config.tileSize;
                        this.mapEditor.drawCursor(x, y, width, height);
                    } else {
                        this.mapEditor.drawCursor(x, y);
                    }
                }
                break;
                
            case 'fill':
                // Show cursor
                this.mapEditor.drawCursor(x, y);
                break;
                
            case 'shape':
                if (this.shapeDraw.active) {
                    // Update shape preview
                    this.handleShapeToolMove(x, y);
                } else {
                    // Show cursor
                    this.mapEditor.drawCursor(x, y);
                }
                break;
        }
    }
    
    handleMouseUp(event) {
        if (this.isDrawing) {
            this.isDrawing = false;
        }
        
        if (this.shapeDraw.active && this.currentTool === 'shape') {
            this.finalizeShapeDraw();
        }
    }
    
    handleRightMouseDown(x, y, event) {
        if (!this.mapEditor.isInBounds(x, y)) return;
        
        const currentLayerId = this.layerManager.getCurrentLayerId();
        
        switch(this.currentTool) {
            case 'select':
                if (this.selection.active) {
                    // Show context menu for selection
                    const screenX = event.clientX;
                    const screenY = event.clientY;
                    this.showContextMenu(screenX, screenY);
                }
                break;
                
            case 'pencil':
                // Erase on right click
                this.undoRedoManager.beginAction();
                const oldTile = this.mapEditor.setTile(currentLayerId, x, y, null);
                this.undoRedoManager.recordTileChange(currentLayerId, x, y, oldTile, null);
                this.undoRedoManager.endAction();
                break;
        }
    }
    
    // Selection tool methods
    handleSelectToolDown(x, y) {
        // If we already have an active selection with content, try to place it
        if (this.selection.active && this.selection.content) {
            this.placeSelection(x, y);
            return;
        }
        
        // Start a new selection
        this.selection = {
            active: true,
            startX: x,
            startY: y,
            width: 1,
            height: 1,
            content: null
        };
        
        // Update selection cursor
        this.mapEditor.drawCursor(x, y, 1, 1);
    }
    
    updateSelectionSize(x, y) {
        // Calculate selection dimensions
        const width = Math.max(1, x - this.selection.startX + 1);
        const height = Math.max(1, y - this.selection.startY + 1);
        
        this.selection.width = width;
        this.selection.height = height;
        
        // Update selection cursor
        this.mapEditor.drawCursor(this.selection.startX, this.selection.startY, width, height);
    }
    
    copySelection() {
        if (!this.selection.active) return;
        
        const { startX, startY, width, height } = this.selection;
        const currentLayerId = this.layerManager.getCurrentLayerId();
        
        // Create content array
        const content = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileX = startX + x;
                const tileY = startY + y;
                
                const tile = this.mapEditor.getTile(currentLayerId, tileX, tileY);
                if (tile) {
                    content.push({
                        x: x,
                        y: y,
                        tile: JSON.parse(JSON.stringify(tile))
                    });
                }
            }
        }
        
        this.selection.content = content;
    }
    
    deleteSelection() {
        if (!this.selection.active) return;
        
        const { startX, startY, width, height } = this.selection;
        const currentLayerId = this.layerManager.getCurrentLayerId();
        
        this.undoRedoManager.beginAction();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileX = startX + x;
                const tileY = startY + y;
                
                const oldTile = this.mapEditor.setTile(currentLayerId, tileX, tileY, null);
                this.undoRedoManager.recordTileChange(currentLayerId, tileX, tileY, oldTile, null);
            }
        }
        
        this.undoRedoManager.endAction();
        
        // Clear selection
        this.selection.active = false;
        this.mapEditor.clearCursor();
    }
    
    flipSelectionHorizontal() {
        if (!this.selection.active || !this.selection.content) return;
        
        const { width } = this.selection;
        
        // Create a new flipped content array
        const flippedContent = [];
        
        for (const item of this.selection.content) {
            flippedContent.push({
                x: width - 1 - item.x,
                y: item.y,
                tile: item.tile
            });
        }
        
        this.selection.content = flippedContent;
    }
    
    placeSelection(targetX, targetY) {
        if (!this.selection.content) return;
        
        const currentLayerId = this.layerManager.getCurrentLayerId();
        
        this.undoRedoManager.beginAction();
        
        for (const item of this.selection.content) {
            const tileX = targetX + item.x;
            const tileY = targetY + item.y;
            
            if (this.mapEditor.isInBounds(tileX, tileY)) {
                const oldTile = this.mapEditor.setTile(currentLayerId, tileX, tileY, item.tile);
                this.undoRedoManager.recordTileChange(currentLayerId, tileX, tileY, oldTile, item.tile);
            }
        }
        
        this.undoRedoManager.endAction();
    }
    
    // Fill tool methods
    handleFillTool(x, y) {
        const currentLayerId = this.layerManager.getCurrentLayerId();
        const selectedTile = this.tilesetManager.getSelectedTile();
        
        if (!selectedTile) return;
        
        const targetTile = this.mapEditor.getTile(currentLayerId, x, y);
        const isSameTile = this.isSameTile(targetTile, selectedTile);
        
        if (isSameTile) return;
        
        this.undoRedoManager.beginAction();
        
        // Flood fill algorithm
        const stack = [{x, y}];
        const visited = new Set();
        
        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            
            visited.add(key);
            
            if (!this.mapEditor.isInBounds(current.x, current.y)) continue;
            
            const currentTile = this.mapEditor.getTile(currentLayerId, current.x, current.y);
            
            if (this.isSameTileAsTarget(currentTile, targetTile)) {
                // Record and set the tile
                const oldTile = this.mapEditor.setTile(currentLayerId, current.x, current.y, selectedTile);
                this.undoRedoManager.recordTileChange(currentLayerId, current.x, current.y, oldTile, selectedTile);
                
                // Add neighbors to stack
                stack.push({x: current.x + 1, y: current.y});
                stack.push({x: current.x - 1, y: current.y});
                stack.push({x: current.x, y: current.y + 1});
                stack.push({x: current.x, y: current.y - 1});
            }
        }
        
        this.undoRedoManager.endAction();
    }
    
    isSameTile(tileA, tileB) {
        if (!tileA && !tileB) return true;
        if (!tileA || !tileB) return false;
        
        return tileA.tilesetId === tileB.tilesetId &&
               tileA.sx === tileB.sx &&
               tileA.sy === tileB.sy &&
               tileA.sWidth === tileB.sWidth &&
               tileA.sHeight === tileB.sHeight;
    }
    
    isSameTileAsTarget(tile, targetTile) {
        if (targetTile === null) return tile === null;
        if (tile === null) return targetTile === null;
        
        // If there's a target tile, compare properties
        if (targetTile) {
            return this.isSameTile(tile, targetTile);
        }
        
        // If no target tile (filling empty space)
        return tile === null;
    }
    
    // Shape tool methods
    handleShapeToolDown(x, y) {
        this.shapeDraw = {
            active: true,
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            filled: true // Default is filled rectangle
        };
        
        // Initial shape preview
        this.previewShape();
    }
    
    handleShapeToolMove(x, y) {
        if (!this.shapeDraw.active) return;
        
        this.shapeDraw.endX = x;
        this.shapeDraw.endY = y;
        
        // Update shape preview
        this.previewShape();
    }
    
    previewShape() {
        if (!this.shapeDraw.active) return;
        
        const { startX, startY, endX, endY } = this.shapeDraw;
        
        // Calculate rectangle bounds
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(endX - startX) + 1;
        const height = Math.abs(endY - startY) + 1;
        
        // Preview with cursor
        this.mapEditor.drawCursor(x, y, width, height);
    }
    
    finalizeShapeDraw() {
        if (!this.shapeDraw.active) return;
        
        const { startX, startY, endX, endY, filled } = this.shapeDraw;
        const selectedTile = this.tilesetManager.getSelectedTile();
        const currentLayerId = this.layerManager.getCurrentLayerId();
        
        if (selectedTile) {
            // Calculate rectangle bounds
            const x = Math.min(startX, endX);
            const y = Math.min(startY, endY);
            const width = Math.abs(endX - startX) + 1;
            const height = Math.abs(endY - startY) + 1;
            
            this.undoRedoManager.beginAction();
            
            if (filled) {
                // Draw filled rectangle
                for (let iy = 0; iy < height; iy++) {
                    for (let ix = 0; ix < width; ix++) {
                        const tileX = x + ix;
                        const tileY = y + iy;
                        
                        if (this.mapEditor.isInBounds(tileX, tileY)) {
                            const oldTile = this.mapEditor.setTile(currentLayerId, tileX, tileY, selectedTile);
                            this.undoRedoManager.recordTileChange(currentLayerId, tileX, tileY, oldTile, selectedTile);
                        }
                    }
                }
            } else {
                // Draw rectangle outline
                for (let ix = 0; ix < width; ix++) {
                    // Top edge
                    if (this.mapEditor.isInBounds(x + ix, y)) {
                        const oldTile = this.mapEditor.setTile(currentLayerId, x + ix, y, selectedTile);
                        this.undoRedoManager.recordTileChange(currentLayerId, x + ix, y, oldTile, selectedTile);
                    }
                    
                    // Bottom edge
                    if (this.mapEditor.isInBounds(x + ix, y + height - 1)) {
                        const oldTile = this.mapEditor.setTile(currentLayerId, x + ix, y + height - 1, selectedTile);
                        this.undoRedoManager.recordTileChange(currentLayerId, x + ix, y + height - 1, oldTile, selectedTile);
                    }
                }
                
                for (let iy = 1; iy < height - 1; iy++) {
                    // Left edge
                    if (this.mapEditor.isInBounds(x, y + iy)) {
                        const oldTile = this.mapEditor.setTile(currentLayerId, x, y + iy, selectedTile);
                        this.undoRedoManager.recordTileChange(currentLayerId, x, y + iy, oldTile, selectedTile);
                    }
                    
                    // Right edge
                    if (this.mapEditor.isInBounds(x + width - 1, y + iy)) {
                        const oldTile = this.mapEditor.setTile(currentLayerId, x + width - 1, y + iy, selectedTile);
                        this.undoRedoManager.recordTileChange(currentLayerId, x + width - 1, y + iy, oldTile, selectedTile);
                    }
                }
            }
            
            this.undoRedoManager.endAction();
        }
        
        // Reset shape drawing state
        this.shapeDraw.active = false;
        this.mapEditor.clearCursor();
    }
    
    // Context menu methods
    showContextMenu(x, y) {
        this.contextMenu.empty();
        
        const menuItems = [
            {
                label: 'Copy',
                action: () => this.copySelection()
            },
            {
                label: 'Delete',
                action: () => this.deleteSelection()
            },
            {
                label: 'Flip Horizontal',
                action: () => this.flipSelectionHorizontal()
            }
        ];
        
        // If we have copied content, add paste option
        if (this.selection.content) {
            menuItems.push({
                label: 'Paste',
                action: () => {
                    // Switch to selection tool if not already
                    this.setTool('select');
                }
            });
        }
        
        // Create menu items
        menuItems.forEach(item => {
            const $menuItem = $('<div></div>')
                .addClass('context-menu-item')
                .text(item.label)
                .on('click', () => {
                    item.action();
                    this.hideContextMenu();
                });
            
            this.contextMenu.append($menuItem);
        });
        
        // Position and show menu
        this.contextMenu.css({
            left: x + 'px',
            top: y + 'px'
        }).show();
        
        // Add document click handler to hide menu
        $(document).one('mousedown', (e) => {
            if (!$(e.target).closest('.context-menu').length) {
                this.hideContextMenu();
            }
        });
    }
    
    hideContextMenu() {
        this.contextMenu.hide();
    }
    
    // Utility methods
    getLinePoints(x0, y0, x1, y1) {
        const points = [];
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        
        while (true) {
            points.push({x: x0, y: y0});
            
            if (x0 === x1 && y0 === y1) break;
            
            const e2 = 2 * err;
            
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
        
        return points;
    }
}
