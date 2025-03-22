export class LayerManager {
    constructor(mapEditor, config) {
        this.mapEditor = mapEditor;
        this.config = config;
        this.container = null;
        this.layers = [];
        this.currentLayer = config.currentLayer;
    }
    
    setContainer($container) {
        this.container = $container;
        this.updateLayerList();
    }
    
    createDefaultLayers() {
        // Create default layers in map editor
        this.createLayer('ground', 'Ground');
        this.createLayer('objects', 'Objects');
        this.createLayer('overlay', 'Overlay');
        
        // Set current layer
        this.setCurrentLayer(this.currentLayer);
    }
    
    createLayer(id, name) {
        // Skip if already exists
        if (this.mapEditor.mapData.layers[id]) return;
        
        // Create layer in map data
        this.mapEditor.mapData.layers[id] = {
            name: name,
            visible: true,
            tiles: {}
        };
        
        // Add to layer list
        this.layers.push({
            id: id,
            name: name,
            visible: true
        });
        
        // Update layer list UI
        this.updateLayerList();
        
        // Also update dropdown in main UI
        this.updateLayerDropdown();
    }
    
    updateLayerDropdown() {
        // Update the layer dropdown in the main UI
        const $dropdown = $('#layerSelect');
        if ($dropdown.length) {
            $dropdown.empty();
            
            this.layers.forEach(layer => {
                $dropdown.append(`<option value="${layer.id}">${layer.name}</option>`);
            });
            
            // Select current layer
            $dropdown.val(this.currentLayer);
        }
    }
    
    addLayer(name) {
        // Generate unique ID
        const id = `layer_${Date.now()}`;
        this.createLayer(id, name);
        
        // Set as current layer
        this.setCurrentLayer(id);
    }
    
    deleteLayer(layerId) {
        // Cannot delete if it's the only layer
        if (this.layers.length <= 1) return;
        
        // Remove from map data
        delete this.mapEditor.mapData.layers[layerId];
        
        // Remove from layer list
        this.layers = this.layers.filter(layer => layer.id !== layerId);
        
        // Update UI
        this.updateLayerList();
        this.updateLayerDropdown();
        
        // If current layer was deleted, select first available layer
        if (this.currentLayer === layerId) {
            this.setCurrentLayer(this.layers[0].id);
        }
    }
    
    deleteCurrentLayer() {
        this.deleteLayer(this.currentLayer);
    }
    
    setCurrentLayer(layerId) {
        // Update current layer
        this.currentLayer = layerId;
        this.config.currentLayer = layerId;
        
        // Update UI
        this.updateLayerList();
        
        // Update dropdown in main UI
        $('#layerSelect').val(layerId);
    }
    
    toggleLayerVisibility(layerId) {
        // Find layer
        const layer = this.mapEditor.mapData.layers[layerId];
        if (!layer) return;
        
        // Toggle visibility
        layer.visible = !layer.visible;
        
        // Update layer list item
        const layerItem = this.layers.find(l => l.id === layerId);
        if (layerItem) {
            layerItem.visible = layer.visible;
        }
        
        // Update UI
        this.updateLayerList();
        
        // Update map visualization
        this.updateMapDisplay();
    }
    
    updateMapDisplay() {
        // Update all canvases based on layer visibility
        const { groundCanvas, objectsCanvas, overlayCanvas } = this.mapEditor;
        
        // Ground layer
        if (this.mapEditor.mapData.layers.ground) {
            groundCanvas.css('display', this.mapEditor.mapData.layers.ground.visible ? 'block' : 'none');
        }
        
        // Objects layer
        if (this.mapEditor.mapData.layers.objects) {
            objectsCanvas.css('display', this.mapEditor.mapData.layers.objects.visible ? 'block' : 'none');
        }
        
        // Overlay layer
        if (this.mapEditor.mapData.layers.overlay) {
            overlayCanvas.css('display', this.mapEditor.mapData.layers.overlay.visible ? 'block' : 'none');
        }
    }
    
    updateLayerList() {
        if (!this.container) return;
        
        this.container.empty();
        
        // Get the layers from map data
        this.layers = [];
        
        // Convert map data layers to UI list
        for (const layerId in this.mapEditor.mapData.layers) {
            const layer = this.mapEditor.mapData.layers[layerId];
            this.layers.push({
                id: layerId,
                name: layer.name,
                visible: layer.visible
            });
        }
        
        // Create layer items
        this.layers.forEach(layer => {
            const $layerItem = $('<div></div>')
                .addClass('layer-item')
                .toggleClass('active', layer.id === this.currentLayer);
            
            const $visibility = $('<span></span>')
                .addClass('layer-visibility')
                .html(layer.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>');
            
            const $name = $('<span></span>').text(layer.name);
            
            $layerItem.append($visibility, $name);
            
            // Add event listeners
            $layerItem.on('click', () => {
                this.setCurrentLayer(layer.id);
            });
            
            $visibility.on('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(layer.id);
            });
            
            this.container.append($layerItem);
        });
        
        // Update map display based on layer visibility
        this.updateMapDisplay();
    }
    
    getCurrentLayerId() {
        return this.currentLayer;
    }
    
    getLayers() {
        return this.layers;
    }
}
