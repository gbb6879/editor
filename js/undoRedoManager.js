export class UndoRedoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.currentAction = null;
    }
    
    beginAction() {
        // Start recording a new action
        if (!this.currentAction) {
            this.currentAction = {
                changes: []
            };
        }
    }
    
    recordTileChange(layerId, x, y, oldTile, newTile) {
        // Record a single tile change
        if (this.currentAction) {
            this.currentAction.changes.push({
                type: 'tile',
                layerId,
                x,
                y,
                oldTile: JSON.parse(JSON.stringify(oldTile || null)),
                newTile: JSON.parse(JSON.stringify(newTile || null))
            });
        }
    }
    
    endAction() {
        // Finish recording the current action
        if (this.currentAction && this.currentAction.changes.length > 0) {
            this.undoStack.push(this.currentAction);
            this.redoStack = []; // Clear redo stack when a new action is performed
            this.currentAction = null;
            
            // Update UI
            this.updateUndoRedoButtons();
        } else {
            this.currentAction = null;
        }
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        const action = this.undoStack.pop();
        const redoAction = {
            changes: []
        };
        
        // Apply changes in reverse order
        for (let i = action.changes.length - 1; i >= 0; i--) {
            const change = action.changes[i];
            
            if (change.type === 'tile') {
                // Get the map editor
                const mapEditor = window.app?.mapEditor;
                if (!mapEditor) return;
                
                // Record for redo
                redoAction.changes.push({
                    type: 'tile',
                    layerId: change.layerId,
                    x: change.x,
                    y: change.y,
                    oldTile: change.newTile,
                    newTile: change.oldTile
                });
                
                // Revert the change
                mapEditor.setTile(change.layerId, change.x, change.y, change.oldTile);
            }
        }
        
        // Add to redo stack
        if (redoAction.changes.length > 0) {
            this.redoStack.push(redoAction);
        }
        
        // Update UI
        this.updateUndoRedoButtons();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        const action = this.redoStack.pop();
        const undoAction = {
            changes: []
        };
        
        // Apply changes
        for (let i = 0; i < action.changes.length; i++) {
            const change = action.changes[i];
            
            if (change.type === 'tile') {
                // Get the map editor
                const mapEditor = window.app?.mapEditor;
                if (!mapEditor) return;
                
                // Record for undo
                undoAction.changes.push({
                    type: 'tile',
                    layerId: change.layerId,
                    x: change.x,
                    y: change.y,
                    oldTile: change.oldTile,
                    newTile: change.newTile
                });
                
                // Apply the change
                mapEditor.setTile(change.layerId, change.x, change.y, change.newTile);
            }
        }
        
        // Add to undo stack
        if (undoAction.changes.length > 0) {
            this.undoStack.push(undoAction);
        }
        
        // Update UI
        this.updateUndoRedoButtons();
    }
    
    updateUndoRedoButtons() {
        // Update the undo/redo buttons state
        $('#undoBtn').prop('disabled', this.undoStack.length === 0);
        $('#redoBtn').prop('disabled', this.redoStack.length === 0);
    }
    
    canUndo() {
        return this.undoStack.length > 0;
    }
    
    canRedo() {
        return this.redoStack.length > 0;
    }
}
