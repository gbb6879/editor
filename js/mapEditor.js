export class MapEditor {
    constructor($container, config) {
        this.container = $container;
        this.config = config;
        
        this.canvasContainer = $('<div class="map-canvas-container"></div>');
        this.groundCanvas = this.createCanvas('map-canvas ground-layer');
        this.objectsCanvas = this.createCanvas('map-canvas objects-layer');
        this.overlayCanvas = this.createCanvas('map-canvas overlay-layer');
        this.gridCanvas = this.createCanvas('map-canvas grid-layer');
        this.cursorCanvas = this.createCanvas('map-canvas cursor-layer');
        
        this.container.append(this.canvasContainer);
        this.canvasContainer.append(
            this.groundCanvas,
            this.objectsCanvas,
            this.overlayCanvas,
            this.gridCanvas,
            this.cursorCanvas
        );
        
        // Create zoom controls
        this.zoomControls = $('<div class="zoom-controls"></div>');
        this.zoomInBtn = $('<button class="zoom-btn" title="Zoom In">+</button>');
        this.zoomOutBtn = $('<button class="zoom-btn" title="Zoom Out">-</button>');
        this.zoomResetBtn = $('<button class="zoom-btn" title="Reset Zoom">1:1</button>');
        this.zoomLevelDisplay = $('<div class="zoom-level">100%</div>');
        
        this.zoomControls.append(
            this.zoomInBtn,
            this.zoomOutBtn,
            this.zoomResetBtn,
            this.zoomLevelDisplay
        );
        
        this.container.append(this.zoomControls);
        
        // Initialize contexts
        this.groundCtx = this.groundCanvas[0].getContext('2d');
        this.objectsCtx = this.objectsCanvas[0].getContext('2d');
        this.overlayCtx = this.overlayCanvas[0].getContext('2d');
        this.gridCtx = this.gridCanvas[0].getContext('2d');
        this.cursorCtx = this.cursorCanvas[0].getContext('2d');
        
        // Initialize map data
        this.mapData = {
            width: config.mapWidth,
            height: config.mapHeight,
            tileSize: config.tileSize,
            layers: {}
        };
        
        // Setup variables for interaction
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.isPanning = false;
        this.lastPanPoint = null;
        
        // Initialize the map
        this.resizeMap(config.mapWidth, config.mapHeight, config.tileSize);
        
        // Add event listeners
        this.setupEventListeners();
    }
    
    setManagers(tilesetManager, layerManager, toolManager, undoRedoManager) {
        this.tilesetManager = tilesetManager;
        this.layerManager = layerManager;
        this.toolManager = toolManager;
        this.undoRedoManager = undoRedoManager;
    }
    
    createCanvas(className) {
        const canvas = $(`<canvas class="${className}"></canvas>`);
        return canvas;
    }
    
    resizeMap(width, height, tileSize) {
        this.mapData.width = width;
        this.mapData.height = height;
        this.mapData.tileSize = tileSize;
        
        const canvasWidth = width * tileSize;
        const canvasHeight = height * tileSize;
        
        this.groundCanvas.attr({ width: canvasWidth, height: canvasHeight });
        this.objectsCanvas.attr({ width: canvasWidth, height: canvasHeight });
        this.overlayCanvas.attr({ width: canvasWidth, height: canvasHeight });
        this.gridCanvas.attr({ width: canvasWidth, height: canvasHeight });
        this.cursorCanvas.attr({ width: canvasWidth, height: canvasHeight });
        
        this.updateAllLayers();
        this.drawGrid();
    }
    
    updateAllLayers() {
        // Clear all canvases
        this.groundCtx.clearRect(0, 0, this.groundCanvas[0].width, this.groundCanvas[0].height);
        this.objectsCtx.clearRect(0, 0, this.objectsCanvas[0].width, this.objectsCanvas[0].height);
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas[0].width, this.overlayCanvas[0].height);
        
        // Draw all layers
        this.drawLayer('ground', this.groundCtx);
        this.drawLayer('objects', this.objectsCtx);
        this.drawLayer('overlay', this.overlayCtx);
    }
    
    drawLayer(layerName, ctx) {
        const layer = this.mapData.layers[layerName];
        if (!layer) return;
        
        const { tileSize } = this.mapData;
        
        for (let y = 0; y < this.mapData.height; y++) {
            for (let x = 0; x < this.mapData.width; x++) {
                const tile = layer.tiles[y * this.mapData.width + x];
                if (tile) {
                    this.drawTile(ctx, tile, x * tileSize, y * tileSize);
                }
            }
        }
    }
    
    drawTile(ctx, tile, x, y) {
        if (!tile.tilesetImage) return;
        
        const img = tile.tilesetImage;
        const { tileSize } = this.mapData;
        
        ctx.drawImage(
            img,
            tile.sx, tile.sy, tile.sWidth, tile.sHeight,
            x, y, tileSize, tileSize
        );
    }
    
    drawGrid() {
        const { width, height, tileSize } = this.mapData;
        const ctx = this.gridCtx;
        
        ctx.clearRect(0, 0, width * tileSize, height * tileSize);
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= width; x++) {
            ctx.moveTo(x * tileSize + 0.5, 0);
            ctx.lineTo(x * tileSize + 0.5, height * tileSize);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= height; y++) {
            ctx.moveTo(0, y * tileSize + 0.5);
            ctx.lineTo(width * tileSize, y * tileSize + 0.5);
        }
        
        ctx.stroke();
    }
    
    drawCursor(x, y, width = 1, height = 1) {
        const { tileSize } = this.mapData;
        const ctx = this.cursorCtx;
        
        ctx.clearRect(0, 0, this.cursorCanvas[0].width, this.cursorCanvas[0].height);
        
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        
        const pixelX = x * tileSize;
        const pixelY = y * tileSize;
        const pixelWidth = width * tileSize;
        const pixelHeight = height * tileSize;
        
        ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
        ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
    }
    
    clearCursor() {
        this.cursorCtx.clearRect(0, 0, this.cursorCanvas[0].width, this.cursorCanvas[0].height);
    }
    
    // Convert screen coordinates to map tile coordinates
    screenToTile(screenX, screenY) {
        const containerOffset = this.canvasContainer.offset();
        const x = (screenX - containerOffset.left - this.pan.x) / this.zoom;
        const y = (screenY - containerOffset.top - this.pan.y) / this.zoom;
        
        const tileX = Math.floor(x / this.mapData.tileSize);
        const tileY = Math.floor(y / this.mapData.tileSize);
        
        return { x: tileX, y: tileY };
    }
    
    // Check if tile coordinates are within map bounds
    isInBounds(tileX, tileY) {
        return tileX >= 0 && tileX < this.mapData.width && 
               tileY >= 0 && tileY < this.mapData.height;
    }
    
    setTile(layerName, x, y, tileData) {
        if (!this.isInBounds(x, y)) return false;
        
        const layer = this.mapData.layers[layerName];
        if (!layer) return false;
        
        const index = y * this.mapData.width + x;
        const oldTile = layer.tiles[index] ? JSON.parse(JSON.stringify(layer.tiles[index])) : null;
        
        if (tileData) {
            layer.tiles[index] = tileData;
        } else {
            delete layer.tiles[index];
        }
        
        // Update the specific layer
        if (layerName === 'ground') {
            this.updateLayerTile(this.groundCtx, x, y, tileData);
        } else if (layerName === 'objects') {
            this.updateLayerTile(this.objectsCtx, x, y, tileData);
        } else if (layerName === 'overlay') {
            this.updateLayerTile(this.overlayCtx, x, y, tileData);
        }
        
        return oldTile;
    }
    
    updateLayerTile(ctx, x, y, tileData) {
        const { tileSize } = this.mapData;
        const pixelX = x * tileSize;
        const pixelY = y * tileSize;
        
        // Clear the tile position
        ctx.clearRect(pixelX, pixelY, tileSize, tileSize);
        
        // Draw the new tile if provided
        if (tileData) {
            this.drawTile(ctx, tileData, pixelX, pixelY);
        }
    }
    
    getTile(layerName, x, y) {
        if (!this.isInBounds(x, y)) return null;
        
        const layer = this.mapData.layers[layerName];
        if (!layer) return null;
        
        const index = y * this.mapData.width + x;
        return layer.tiles[index];
    }
    
    setupEventListeners() {
        // Mouse events for the canvas container
        this.canvasContainer.on('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button
                this.isPanning = true;
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                this.canvasContainer.css('cursor', 'grabbing');
                return;
            }
            
            if (this.toolManager) {
                const tilePos = this.screenToTile(e.clientX, e.clientY);
                if (e.button === 0) { // Left mouse button
                    this.toolManager.handleMouseDown(tilePos.x, tilePos.y, e);
                } else if (e.button === 2) { // Right mouse button
                    this.toolManager.handleRightMouseDown(tilePos.x, tilePos.y, e);
                }
            }
        });
        
        $(document).on('mouseup', (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvasContainer.css('cursor', 'default');
            }
            
            if (this.toolManager) {
                this.toolManager.handleMouseUp(e);
            }
        });
        
        this.canvasContainer.on('mousemove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.lastPanPoint.x;
                const dy = e.clientY - this.lastPanPoint.y;
                
                this.pan.x += dx;
                this.pan.y += dy;
                
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                this.updateTransform();
                return;
            }
            
            if (this.toolManager) {
                const tilePos = this.screenToTile(e.clientX, e.clientY);
                
                // Only update if the tile position is valid
                if (this.isInBounds(tilePos.x, tilePos.y)) {
                    this.toolManager.handleMouseMove(tilePos.x, tilePos.y, e);
                } else {
                    this.clearCursor();
                }
            }
        });
        
        // Prevent context menu
        this.canvasContainer.on('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Mouse wheel for zooming
        this.canvasContainer.on('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.originalEvent.deltaY;
            const oldZoom = this.zoom;
            
            if (delta < 0) {
                this.zoom = Math.min(10, this.zoom * 1.1);
            } else {
                this.zoom = Math.max(0.1, this.zoom / 1.1);
            }
            
            // Calculate mouse position relative to canvas
            const containerOffset = this.canvasContainer.offset();
            const mouseX = e.clientX - containerOffset.left - this.pan.x;
            const mouseY = e.clientY - containerOffset.top - this.pan.y;
            
            // Adjust pan to zoom towards mouse position
            this.pan.x -= mouseX * (this.zoom / oldZoom - 1);
            this.pan.y -= mouseY * (this.zoom / oldZoom - 1);
            
            this.updateTransform();
            this.updateZoomDisplay();
        });
        
        // Zoom control buttons
        this.zoomInBtn.on('click', () => {
            this.zoom = Math.min(10, this.zoom * 1.2);
            this.updateTransform();
            this.updateZoomDisplay();
        });
        
        this.zoomOutBtn.on('click', () => {
            this.zoom = Math.max(0.1, this.zoom / 1.2);
            this.updateTransform();
            this.updateZoomDisplay();
        });
        
        this.zoomResetBtn.on('click', () => {
            this.zoom = 1;
            this.updateTransform();
            this.updateZoomDisplay();
        });
    }
    
    updateTransform() {
        this.canvasContainer.css('transform', `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`);
    }
    
    updateZoomDisplay() {
        const percentage = Math.round(this.zoom * 100);
        this.zoomLevelDisplay.text(`${percentage}%`);
    }
    
    exportMap() {
        const exportData = {
            width: this.mapData.width,
            height: this.mapData.height,
            tileSize: this.mapData.tileSize,
            layers: {}
        };
        
        // Export each layer's tile data
        for (const layerName in this.mapData.layers) {
            const layer = this.mapData.layers[layerName];
            exportData.layers[layerName] = {
                name: layer.name,
                visible: layer.visible,
                tiles: []
            };
            
            // Convert tiles object to array format for export
            for (let y = 0; y < this.mapData.height; y++) {
                for (let x = 0; x < this.mapData.width; x++) {
                    const index = y * this.mapData.width + x;
                    const tile = layer.tiles[index];
                    
                    if (tile) {
                        exportData.layers[layerName].tiles.push({
                            x: x,
                            y: y,
                            tilesetId: tile.tilesetId,
                            sx: tile.sx,
                            sy: tile.sy,
                            sWidth: tile.sWidth,
                            sHeight: tile.sHeight
                        });
                    }
                }
            }
        }
        
        return exportData;
    }
    
    importMap(mapData) {
        this.mapData = {
            width: mapData.width,
            height: mapData.height,
            tileSize: mapData.tileSize,
            layers: {}
        };
        
        // Resize canvases
        this.resizeMap(mapData.width, mapData.height, mapData.tileSize);
        
        // Create tilesets mapping
        const tilesetMap = {};
        if (this.tilesetManager) {
            const tilesets = this.tilesetManager.getTilesets();
            tilesets.forEach(tileset => {
                tilesetMap[tileset.id] = tileset.image;
            });
        }
        
        // Import layers
        for (const layerName in mapData.layers) {
            const layerData = mapData.layers[layerName];
            
            // Create the layer if it doesn't exist
            if (!this.mapData.layers[layerName]) {
                this.mapData.layers[layerName] = {
                    name: layerData.name || layerName,
                    visible: layerData.visible !== undefined ? layerData.visible : true,
                    tiles: {}
                };
            }
            
            const layer = this.mapData.layers[layerName];
            
            // Import tiles
            layerData.tiles.forEach(tileData => {
                const { x, y, tilesetId, sx, sy, sWidth, sHeight } = tileData;
                const index = y * this.mapData.width + x;
                
                // Create tile with image reference
                if (tilesetMap[tilesetId]) {
                    layer.tiles[index] = {
                        tilesetId,
                        tilesetImage: tilesetMap[tilesetId],
                        sx, sy, sWidth, sHeight
                    };
                }
            });
        }
        
        // Update all layers
        this.updateAllLayers();
        
        // Update the layer manager if available
        if (this.layerManager) {
            this.layerManager.updateLayerList();
        }
    }
}
