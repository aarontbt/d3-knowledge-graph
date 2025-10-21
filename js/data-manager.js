/**
 * Data Manager Module
 * Handles graph data operations, persistence, and CRUD operations
 */

export class DataManager {
    constructor() {
        this.storageKey = 'knowledge-graph-data';
        this.data = {
            nodes: [],
            edges: []
        };
        this.listeners = [];

        // Load from localStorage on init
        this.loadFromStorage();
    }

    /**
     * Add a change listener
     */
    addChangeListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of data changes
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.data));
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get all data
     */
    getData() {
        return JSON.parse(JSON.stringify(this.data));
    }

    /**
     * Set all data
     */
    setData(data) {
        this.data = {
            nodes: data.nodes || [],
            edges: data.edges || []
        };
        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Get node by ID
     */
    getNode(id) {
        return this.data.nodes.find(node => node.id === id);
    }

    /**
     * Add new node
     */
    addNode(nodeData) {
        const node = {
            id: this.generateId(),
            label: nodeData.label || 'Untitled',
            content: nodeData.content || '',
            metadata: {
                created: new Date().toISOString(),
                tags: nodeData.tags || [],
                ...nodeData.metadata
            }
        };

        this.data.nodes.push(node);
        this.saveToStorage();
        this.notifyListeners();

        return node;
    }

    /**
     * Update existing node
     */
    updateNode(id, updates) {
        const nodeIndex = this.data.nodes.findIndex(node => node.id === id);
        if (nodeIndex === -1) {
            throw new Error(`Node with id ${id} not found`);
        }

        // Update node while preserving ID and created date
        this.data.nodes[nodeIndex] = {
            ...this.data.nodes[nodeIndex],
            ...updates,
            id: id, // Ensure ID doesn't change
            metadata: {
                ...this.data.nodes[nodeIndex].metadata,
                ...updates.metadata,
                created: this.data.nodes[nodeIndex].metadata.created,
                modified: new Date().toISOString()
            }
        };

        this.saveToStorage();
        this.notifyListeners();

        return this.data.nodes[nodeIndex];
    }

    /**
     * Delete node and associated edges
     */
    deleteNode(id) {
        // Remove node
        this.data.nodes = this.data.nodes.filter(node => node.id !== id);

        // Remove associated edges
        this.data.edges = this.data.edges.filter(
            edge => edge.source !== id && edge.target !== id
        );

        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Add new edge
     */
    addEdge(sourceId, targetId, label = '') {
        // Check if nodes exist
        const sourceExists = this.data.nodes.some(node => node.id === sourceId);
        const targetExists = this.data.nodes.some(node => node.id === targetId);

        if (!sourceExists || !targetExists) {
            throw new Error('Source or target node does not exist');
        }

        // Check if edge already exists
        const edgeExists = this.data.edges.some(
            edge => edge.source === sourceId && edge.target === targetId
        );

        if (edgeExists) {
            throw new Error('Edge already exists');
        }

        const edge = {
            source: sourceId,
            target: targetId,
            label: label
        };

        this.data.edges.push(edge);
        this.saveToStorage();
        this.notifyListeners();

        return edge;
    }

    /**
     * Delete edge
     */
    deleteEdge(sourceId, targetId) {
        this.data.edges = this.data.edges.filter(
            edge => !(edge.source === sourceId && edge.target === targetId)
        );

        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Clear all data
     */
    clear() {
        this.data = {
            nodes: [],
            edges: []
        };
        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.data = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
    }

    /**
     * Export data as JSON
     */
    exportJSON() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `knowledge-graph-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Import data from JSON file
     */
    importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    // Validate data structure
                    if (!data.nodes || !Array.isArray(data.nodes)) {
                        throw new Error('Invalid data format: nodes array missing');
                    }

                    if (!data.edges || !Array.isArray(data.edges)) {
                        throw new Error('Invalid data format: edges array missing');
                    }

                    // Set data
                    this.setData(data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Search nodes
     */
    searchNodes(query) {
        const lowerQuery = query.toLowerCase();

        return this.data.nodes.filter(node => {
            // Search in label
            if (node.label.toLowerCase().includes(lowerQuery)) {
                return true;
            }

            // Search in content
            if (node.content && node.content.toLowerCase().includes(lowerQuery)) {
                return true;
            }

            // Search in tags
            if (node.metadata && node.metadata.tags) {
                if (node.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                    return true;
                }
            }

            return false;
        });
    }

    /**
     * Get nodes by tag
     */
    getNodesByTag(tag) {
        return this.data.nodes.filter(node =>
            node.metadata &&
            node.metadata.tags &&
            node.metadata.tags.includes(tag)
        );
    }

    /**
     * Get all unique tags
     */
    getAllTags() {
        const tags = new Set();
        this.data.nodes.forEach(node => {
            if (node.metadata && node.metadata.tags) {
                node.metadata.tags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags);
    }

    /**
     * Get connected nodes
     */
    getConnectedNodes(nodeId) {
        const connected = new Set();

        this.data.edges.forEach(edge => {
            if (edge.source === nodeId) {
                connected.add(edge.target);
            }
            if (edge.target === nodeId) {
                connected.add(edge.source);
            }
        });

        return Array.from(connected).map(id => this.getNode(id));
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalNodes: this.data.nodes.length,
            totalEdges: this.data.edges.length,
            totalTags: this.getAllTags().length
        };
    }
}
