export class TilesetManager {
    constructor(config, $fileInput) {
        this.config = config;
        this.fileInput = $fileInput;
        this.container = null;
        
        this.tilesets = [];
        this.currentTilesetId = null;
        
        this.canvasContainer = $('<div class="tileset-canvas-container"></div>');
        this.canvas = $('<canvas class="tileset-canvas"></canvas>');
        this.selectionElement = $('<div class="tileset-selection"></div>');
        
        this.canvasContainer.append(this.canvas, this.selectionElement);
        
        this.ctx = this.canvas[0].getContext('2d');
        
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.isPanning = false;
        this.lastPanPoint = null;
        
        this.selection = {
            startX: -1,
            startY: -1,
            width: 1,
            height: 1,
            active: false
        };
        
        // Add zoom controls for tileset
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
        
        this.initEventListeners();
    }
    
    setContainer($container) {
        this.container = $container;
        this.container.empty();
        this.container.append(this.canvasContainer);
        this.container.append(this.zoomControls);
        
        // If we already have tilesets, render them
        this.renderTileset();
    }
    
    initEventListeners() {
        // File upload
        this.fileInput.on('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.loadTilesetImage(files[0]);
            }
        });
        
        // Mouse events for selection
        this.canvasContainer.on('mousedown', (e) => {
            if (e.button === 1) { // Middle mouse button for panning
                this.isPanning = true;
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                this.canvasContainer.css('cursor', 'grabbing');
                return;
            }
            
            if (e.button === 0) { // Left mouse button for selection
                const containerOffset = this.canvasContainer.offset();
                const x = (e.clientX - containerOffset.left - this.pan.x) / this.zoom;
                const y = (e.clientY - containerOffset.top - this.pan.y) / this.zoom;
                
                // Snap to grid based on tile size
                const tileSize = this.config.tileSize;
                const tileX = Math.floor(x / tileSize);
                const tileY = Math.floor(y / tileSize);
                
                this.selection = {
                    startX: tileX,
                    startY: tileY,
                    width: 1,
                    height: 1,
                    active: true,
                    dragging: true
                };
                
                this.updateSelectionDisplay();
            }
        });
        
        $(document).on('mouseup', (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvasContainer.css('cursor', 'default');
            }
            
            if (this.selection.dragging) {
                this.selection.dragging = false;
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
            
            if (this.selection.dragging && this.selection.active) {
                const containerOffset = this.canvasContainer.offset();
                const x = (e.clientX - containerOffset.left - this.pan.x) / this.zoom;
                const y = (e.clientY - containerOffset.top - this.pan.y) / this.zoom;
                
                // Snap to grid
                const tileSize = this.config.tileSize;
                const tileX = Math.floor(x / tileSize);
                const tileY = Math.floor(y / tileSize);
                
                // Calculate selection width and height
                const width = Math.max(1, tileX - this.selection.startX + 1);
                const height = Math.max(1, tileY - this.selection.startY + 1);
                
                this.selection.width = width;
                this.selection.height = height;
                
                this.updateSelectionDisplay();
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
    
    updateSelectionDisplay() {
        if (!this.selection.active) {
            this.selectionElement.hide();
            return;
        }
        
        const tileSize = this.config.tileSize;
        const x = this.selection.startX * tileSize;
        const y = this.selection.startY * tileSize;
        const width = this.selection.width * tileSize;
        const height = this.selection.height * tileSize;
        
        this.selectionElement.css({
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`
        });
        
        this.selectionElement.show();
    }
    
    loadTilesetImage(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create a new tileset
                const tilesetId = Date.now().toString();
                const tileset = {
                    id: tilesetId,
                    name: file.name,
                    image: img,
                    width: img.width,
                    height: img.height
                };
                
                // Add to the list of tilesets
                this.tilesets.push(tileset);
                
                // Set as current
                this.currentTilesetId = tilesetId;
                
                // Render to canvas
                this.renderTileset();
            };
            
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }
    
    renderTileset() {
        if (!this.container) return;
        
        // Find the current tileset
        const tileset = this.tilesets.find(ts => ts.id === this.currentTilesetId);
        
        if (!tileset) {
            // Clear canvas if no tileset
            this.canvas.attr({ width: 0, height: 0 });
            return;
        }
        
        // Set canvas size
        this.canvas.attr({
            width: tileset.width,
            height: tileset.height
        });
        
        // Draw the tileset
        this.ctx.clearRect(0, 0, tileset.width, tileset.height);
        this.ctx.drawImage(tileset.image, 0, 0);
        
        // Add grid overlay
        this.drawGrid();
    }
    
    drawGrid() {
        const tileset = this.tilesets.find(ts => ts.id === this.currentTilesetId);
        if (!tileset) return;
        
        const { width, height } = tileset;
        const tileSize = this.config.tileSize;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= width; x += tileSize) {
            this.ctx.moveTo(x + 0.5, 0);
            this.ctx.lineTo(x + 0.5, height);
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= height; y += tileSize) {
            this.ctx.moveTo(0, y + 0.5);
            this.ctx.lineTo(width, y + 0.5);
        }
        
        this.ctx.stroke();
    }
    
    getSelectedTile() {
        if (!this.selection.active) return null;
        
        const tileset = this.tilesets.find(ts => ts.id === this.currentTilesetId);
        if (!tileset) return null;
        
        const tileSize = this.config.tileSize;
        const x = this.selection.startX * tileSize;
        const y = this.selection.startY * tileSize;
        const width = this.selection.width * tileSize;
        const height = this.selection.height * tileSize;
        
        return {
            tilesetId: tileset.id,
            tilesetImage: tileset.image,
            sx: x, 
            sy: y, 
            sWidth: width, 
            sHeight: height
        };
    }
    
    getTilesets() {
        return this.tilesets;
    }
}
