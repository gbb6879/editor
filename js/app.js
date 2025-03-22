// App.js - Main application file for Map Editor 3000
// No imports needed as we're loading scripts via script tags

class App {
    constructor() {
        this.mapEditor = null;
        this.tilesetManager = null;
        this.layerManager = null;
        this.toolManager = null;
        this.undoRedoManager = null;
        
        this.config = {
            tileSize: 32,
            mapWidth: 20,
            mapHeight: 15,
            currentLayer: 'ground'
        };

        // We'll initialize in the DOMContentLoaded event instead
        this.initEventListeners();
    }

    initLayout() {
        console.log('Initializing GoldenLayout...');
        
        // Simplified GoldenLayout initialization
        try {
            const layoutConfig = {
                settings: {
                    showPopoutIcon: false,
                    showMaximiseIcon: true,
                    showCloseIcon: false,
                    hasHeaders: true
                },
                dimensions: {
                    borderWidth: 5,
                    minItemHeight: 100,
                    minItemWidth: 100
                },
                content: [{
                    type: 'row',
                    content: [{
                        type: 'component',
                        componentName: 'mapEditor',
                        componentState: { label: 'Map Editor' },
                        width: 60,
                        title: 'Map Editor'
                    }, {
                        type: 'column',
                        width: 40,
                        content: [{
                            type: 'component',
                            componentName: 'tilesetPanel',
                            componentState: { label: 'Tileset' },
                            height: 70,
                            title: 'Tileset'
                        }, {
                            type: 'component',
                            componentName: 'layersPanel',
                            componentState: { label: 'Layers' },
                            height: 30,
                            title: 'Layers'
                        }]
                    }]
                }]
            };
                
            // Force recreation of container
            const $container = $('#layout-container');
            $container.empty();
                
            // Create new layout instance
            this.layout = new GoldenLayout(layoutConfig, $container);
                
            // Register components
            this.registerComponents();
                
            // Initialize the layout
            this.layout.init();
            console.log('GoldenLayout initialized successfully');
                
            // Handle window resize 
            $(window).on('resize', () => {
                this.layout.updateSize();
            });
        } catch (error) {
            console.error('Error initializing GoldenLayout:', error);
            alert('Failed to initialize the editor layout. Please check the console for details.');
        }
    }
    
    registerComponents() {
        this.layout.registerComponent('mapEditor', (container, state) => {
            const $el = $('<div class="map-editor"></div>');
            container.getElement().append($el);
            
            // Initialize the MapEditor after the container is shown
            container.on('shown', () => {
                console.log('Map editor container shown');
                this.mapEditor = new MapEditor($el, this.config);
                this.initManagers();
            });
        });

        this.layout.registerComponent('tilesetPanel', (container, state) => {
            const $el = $('<div class="tileset-panel"></div>');
            const $toolbar = $('<div class="tileset-toolbar"></div>');
            const $uploadBtn = $('<button class="tool-btn">Upload Tileset</button>');
            const $content = $('<div class="tileset-content"></div>');
            
            $toolbar.append($uploadBtn);
            $el.append($toolbar, $content);
            container.getElement().append($el);
            
            $uploadBtn.on('click', () => {
                $('#tilesetUpload').click();
            });
            
            container.on('shown', () => {
                console.log('Tileset panel shown');
                if (this.tilesetManager) {
                    this.tilesetManager.setContainer($content);
                }
            });
        });

        this.layout.registerComponent('layersPanel', (container, state) => {
            const $el = $('<div class="layers-panel"></div>');
            const $toolbar = $('<div class="layers-toolbar"></div>');
            const $addBtn = $('<button class="tool-btn">Add Layer</button>');
            const $deleteBtn = $('<button class="tool-btn">Delete Layer</button>');
            const $list = $('<div class="layers-list"></div>');
            
            $toolbar.append($addBtn, $deleteBtn);
            $el.append($toolbar, $list);
            container.getElement().append($el);
            
            container.on('shown', () => {
                console.log('Layers panel shown');
                if (this.layerManager) {
                    this.layerManager.setContainer($list);
                    this.layerManager.updateLayerList();
                }
            });
            
            $addBtn.on('click', () => {
                if (this.layerManager) {
                    const name = prompt('Enter layer name:');
                    if (name) {
                        this.layerManager.addLayer(name);
                    }
                }
            });
            
            $deleteBtn.on('click', () => {
                if (this.layerManager) {
                    this.layerManager.deleteCurrentLayer();
                }
            });
        });
    }

    initManagers() {
        try {
            console.log('Initializing managers...');
            if (!this.mapEditor) {
                console.error('MapEditor not initialized');
                return;
            }
            
            this.undoRedoManager = new UndoRedoManager();
            
            this.tilesetManager = new TilesetManager(this.config, $('#tilesetUpload'));
            
            this.layerManager = new LayerManager(this.mapEditor, this.config);
            this.layerManager.createDefaultLayers();
            
            this.toolManager = new ToolManager(
                this.mapEditor,
                this.tilesetManager,
                this.layerManager,
                this.undoRedoManager,
                this.config
            );
            
            // Connect the managers with each other
            this.mapEditor.setManagers(
                this.tilesetManager,
                this.layerManager,
                this.toolManager,
                this.undoRedoManager
            );
            
            // Initialize layer selection
            $('#layerSelect').on('change', (e) => {
                this.config.currentLayer = $(e.target).val();
                this.layerManager.setCurrentLayer(this.config.currentLayer);
            });
            
            console.log('All managers initialized successfully');
        } catch (error) {
            console.error('Error initializing managers:', error);
            alert('Failed to initialize editor components. Please check the console for details.');
        }
    }

    initEventListeners() {
        try {
            console.log('Initializing event listeners...');
            // Tool buttons
            $('#selectTool').on('click', () => {
                console.log('Select tool clicked');
                if (this.toolManager) this.toolManager.setTool('select');
            });
            
            $('#pencilTool').on('click', () => {
                console.log('Pencil tool clicked');
                if (this.toolManager) this.toolManager.setTool('pencil');
            });
            
            $('#fillTool').on('click', () => {
                console.log('Fill tool clicked');
                if (this.toolManager) this.toolManager.setTool('fill');
            });
            
            $('#shapeTool').on('click', () => {
                console.log('Shape tool clicked');
                if (this.toolManager) this.toolManager.setTool('shape');
            });
            
            // Undo/Redo
            $('#undoBtn').on('click', () => {
                console.log('Undo clicked');
                if (this.undoRedoManager) this.undoRedoManager.undo();
            });
            
            $('#redoBtn').on('click', () => {
                console.log('Redo clicked');
                if (this.undoRedoManager) this.undoRedoManager.redo();
            });
            
            // Apply map size
            $('#applyMapSize').on('click', () => {
                console.log('Apply map size clicked');
                const tileSize = parseInt($('#tileSize').val(), 10);
                const mapWidth = parseInt($('#mapWidth').val(), 10);
                const mapHeight = parseInt($('#mapHeight').val(), 10);
                
                if (tileSize > 0 && mapWidth > 0 && mapHeight > 0) {
                    this.config.tileSize = tileSize;
                    this.config.mapWidth = mapWidth;
                    this.config.mapHeight = mapHeight;
                    
                    if (this.mapEditor) {
                        this.mapEditor.resizeMap(mapWidth, mapHeight, tileSize);
                    }
                }
            });
            
            // Export/Import
            $('#exportBtn').on('click', () => {
                console.log('Export clicked');
                if (this.mapEditor) {
                    const mapData = this.mapEditor.exportMap();
                    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'map.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            });
            
            $('#importBtn').on('click', () => {
                console.log('Import clicked');
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const mapData = JSON.parse(event.target.result);
                            if (this.mapEditor) {
                                this.mapEditor.importMap(mapData);
                                
                                // Update UI
                                $('#tileSize').val(mapData.tileSize);
                                $('#mapWidth').val(mapData.width);
                                $('#mapHeight').val(mapData.height);
                                
                                // Update config
                                this.config.tileSize = mapData.tileSize;
                                this.config.mapWidth = mapData.width;
                                this.config.mapHeight = mapData.height;
                            }
                        } catch (err) {
                            console.error('Error importing map:', err);
                            alert('Failed to import map. Invalid format.');
                        }
                    };
                    reader.readAsText(file);
                };
                
                input.click();
            });
            
            console.log('Event listeners initialized successfully');
        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing app...');
    try {
        const app = new App();
        app.initLayout();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to initialize the editor. Please check the console for details.');
    }
});
