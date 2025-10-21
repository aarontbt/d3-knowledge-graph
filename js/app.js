/**
 * Main Application Module
 * Orchestrates the knowledge graph application
 */

import { GraphVisualizer } from './graph.js';
import { DataManager } from './data-manager.js';
import { MarkdownRenderer } from './markdown-renderer.js';

class KnowledgeGraphApp {
    constructor() {
        // Initialize modules
        this.dataManager = new DataManager();
        this.markdownRenderer = new MarkdownRenderer();

        // Initialize graph visualizer
        this.graph = new GraphVisualizer('#graph-svg', {
            onNodeClick: (node) => this.handleNodeClick(node),
            onNodeDoubleClick: (node) => this.handleNodeDoubleClick(node)
        });

        // Current selected node
        this.selectedNode = null;

        // Edit mode
        this.editingNodeId = null;

        // Initialize UI
        this.initUI();

        // Load initial data
        this.loadData();

        // Listen for data changes
        this.dataManager.addChangeListener(() => this.loadData());
    }

    initUI() {
        // Header buttons
        document.getElementById('add-node-btn').addEventListener('click', () => this.showNodeModal());
        document.getElementById('add-edge-btn').addEventListener('click', () => this.showEdgeModal());
        document.getElementById('center-graph-btn').addEventListener('click', () => this.graph.centerGraph());

        // Search
        document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // File menu
        document.getElementById('import-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleImport();
        });
        document.getElementById('export-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleExport();
        });
        document.getElementById('clear-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClear();
        });
        document.getElementById('load-sample-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.loadSampleData();
        });

        // Graph controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => this.graph.zoomIn());
        document.getElementById('zoom-out-btn').addEventListener('click', () => this.graph.zoomOut());
        document.getElementById('reset-zoom-btn').addEventListener('click', () => this.graph.resetZoom());

        // Side panel
        document.getElementById('close-panel-btn').addEventListener('click', () => this.closePanel());
        document.getElementById('edit-node-btn').addEventListener('click', () => this.editSelectedNode());
        document.getElementById('delete-node-btn').addEventListener('click', () => this.deleteSelectedNode());

        // Node modal
        this.initNodeModal();

        // Edge modal
        this.initEdgeModal();

        // File input
        document.getElementById('file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.dataManager.importJSON(file)
                    .then(() => {
                        alert('Graph imported successfully!');
                    })
                    .catch(error => {
                        alert('Error importing file: ' + error.message);
                    });
            }
            e.target.value = ''; // Reset file input
        });
    }

    initNodeModal() {
        const modal = document.getElementById('node-modal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-node-btn');
        const form = document.getElementById('node-form');

        closeBtn.addEventListener('click', () => this.closeNodeModal());
        cancelBtn.addEventListener('click', () => this.closeNodeModal());

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNodeFormSubmit();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeNodeModal();
            }
        });
    }

    initEdgeModal() {
        const modal = document.getElementById('edge-modal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-edge-btn');
        const form = document.getElementById('edge-form');

        closeBtn.addEventListener('click', () => this.closeEdgeModal());
        cancelBtn.addEventListener('click', () => this.closeEdgeModal());

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEdgeFormSubmit();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEdgeModal();
            }
        });
    }

    loadData() {
        const data = this.dataManager.getData();
        this.graph.setData(data.nodes, data.edges);
        this.updateStats();
    }

    updateStats() {
        const stats = this.graph.getStats();
        document.getElementById('node-count').textContent = stats.nodeCount;
        document.getElementById('edge-count').textContent = stats.edgeCount;
    }

    handleNodeClick(node) {
        this.selectedNode = node;
        this.showNodeDetails(node);
    }

    handleNodeDoubleClick(node) {
        this.editNode(node.id);
    }

    showNodeDetails(node) {
        const panel = document.getElementById('side-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');
        const actions = document.getElementById('panel-actions');

        title.textContent = node.label;
        content.innerHTML = this.markdownRenderer.renderNode(node);
        actions.style.display = 'flex';

        panel.classList.add('open');
    }

    closePanel() {
        const panel = document.getElementById('side-panel');
        const actions = document.getElementById('panel-actions');

        panel.classList.remove('open');
        actions.style.display = 'none';
        this.selectedNode = null;
        this.graph.clearSelection();
    }

    showNodeModal(node = null) {
        const modal = document.getElementById('node-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('node-form');

        // Reset form
        form.reset();

        if (node) {
            // Edit mode
            title.textContent = 'Edit Node';
            document.getElementById('node-label').value = node.label;
            document.getElementById('node-content').value = node.content || '';
            document.getElementById('node-tags').value = node.metadata?.tags?.join(', ') || '';
            this.editingNodeId = node.id;
        } else {
            // Create mode
            title.textContent = 'Add Node';
            this.editingNodeId = null;
        }

        modal.classList.add('active');
    }

    closeNodeModal() {
        const modal = document.getElementById('node-modal');
        modal.classList.remove('active');
        this.editingNodeId = null;
    }

    handleNodeFormSubmit() {
        const label = document.getElementById('node-label').value.trim();
        const content = document.getElementById('node-content').value.trim();
        const tagsInput = document.getElementById('node-tags').value.trim();
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

        if (!label) {
            alert('Please enter a label');
            return;
        }

        const nodeData = {
            label,
            content,
            metadata: { tags }
        };

        try {
            if (this.editingNodeId) {
                // Update existing node
                this.dataManager.updateNode(this.editingNodeId, nodeData);
            } else {
                // Create new node
                this.dataManager.addNode(nodeData);
            }

            this.closeNodeModal();
        } catch (error) {
            alert('Error saving node: ' + error.message);
        }
    }

    showEdgeModal() {
        const modal = document.getElementById('edge-modal');
        const sourceSelect = document.getElementById('edge-source');
        const targetSelect = document.getElementById('edge-target');

        // Populate node selects
        const data = this.dataManager.getData();
        const options = data.nodes.map(node =>
            `<option value="${node.id}">${node.label}</option>`
        ).join('');

        sourceSelect.innerHTML = '<option value="">Select source node</option>' + options;
        targetSelect.innerHTML = '<option value="">Select target node</option>' + options;

        // Pre-select if a node is selected
        if (this.selectedNode) {
            sourceSelect.value = this.selectedNode.id;
        }

        modal.classList.add('active');
    }

    closeEdgeModal() {
        const modal = document.getElementById('edge-modal');
        modal.classList.remove('active');
        document.getElementById('edge-form').reset();
    }

    handleEdgeFormSubmit() {
        const sourceId = document.getElementById('edge-source').value;
        const targetId = document.getElementById('edge-target').value;
        const label = document.getElementById('edge-label').value.trim();

        if (!sourceId || !targetId) {
            alert('Please select both source and target nodes');
            return;
        }

        if (sourceId === targetId) {
            alert('Source and target must be different nodes');
            return;
        }

        try {
            this.dataManager.addEdge(sourceId, targetId, label);
            this.closeEdgeModal();
        } catch (error) {
            alert('Error creating edge: ' + error.message);
        }
    }

    editSelectedNode() {
        if (this.selectedNode) {
            this.editNode(this.selectedNode.id);
        }
    }

    editNode(nodeId) {
        const node = this.dataManager.getNode(nodeId);
        if (node) {
            this.showNodeModal(node);
        }
    }

    deleteSelectedNode() {
        if (!this.selectedNode) return;

        if (confirm(`Are you sure you want to delete "${this.selectedNode.label}"? This will also remove all connected edges.`)) {
            this.dataManager.deleteNode(this.selectedNode.id);
            this.closePanel();
        }
    }

    handleSearch() {
        const query = document.getElementById('search-input').value.trim();

        if (!query) {
            alert('Please enter a search query');
            return;
        }

        const results = this.dataManager.searchNodes(query);

        if (results.length === 0) {
            alert('No results found');
            return;
        }

        if (results.length === 1) {
            // Single result - select and show
            this.graph.highlightNode(results[0].id);
            this.showNodeDetails(results[0]);
        } else {
            // Multiple results - show list
            const resultList = results.map((node, i) =>
                `${i + 1}. ${node.label}`
            ).join('\n');

            alert(`Found ${results.length} results:\n\n${resultList}\n\nClick on a node to view details.`);

            // Highlight first result
            this.graph.highlightNode(results[0].id);
        }
    }

    handleImport() {
        document.getElementById('file-input').click();
    }

    handleExport() {
        this.dataManager.exportJSON();
    }

    handleClear() {
        if (confirm('Are you sure you want to clear the entire graph? This action cannot be undone.')) {
            this.dataManager.clear();
            this.closePanel();
        }
    }

    loadSampleData() {
        if (this.dataManager.getData().nodes.length > 0) {
            if (!confirm('This will replace your current graph. Continue?')) {
                return;
            }
        }

        // Load sample data from file
        fetch('data/sample-graph.json')
            .then(response => response.json())
            .then(data => {
                this.dataManager.setData(data);
                alert('Sample graph loaded successfully!');
                setTimeout(() => this.graph.centerGraph(), 500);
            })
            .catch(error => {
                console.error('Error loading sample data:', error);
                alert('Error loading sample data. Creating default sample...');
                this.createDefaultSample();
            });
    }

    createDefaultSample() {
        const sampleData = {
            nodes: [
                {
                    id: 'node_1',
                    label: 'Knowledge Graph',
                    content: '# Knowledge Graph\n\nA **knowledge graph** is a structured representation of knowledge that uses nodes and edges to represent entities and their relationships.\n\n## Key Features\n\n- Visual representation of information\n- Interconnected concepts\n- Semantic relationships\n- Graph-based data structure',
                    metadata: {
                        created: new Date().toISOString(),
                        tags: ['core', 'concept']
                    }
                },
                {
                    id: 'node_2',
                    label: 'D3.js',
                    content: '# D3.js\n\nD3.js (Data-Driven Documents) is a JavaScript library for creating interactive data visualizations.\n\n## Capabilities\n\n- Force-directed graphs\n- Tree layouts\n- Network diagrams\n- Custom visualizations',
                    metadata: {
                        created: new Date().toISOString(),
                        tags: ['technology', 'visualization']
                    }
                },
                {
                    id: 'node_3',
                    label: 'Markdown',
                    content: '# Markdown\n\nMarkdown is a lightweight markup language for creating formatted text.\n\n## Syntax Examples\n\n```markdown\n# Heading\n**bold** and *italic*\n- List items\n[Links](url)\n```',
                    metadata: {
                        created: new Date().toISOString(),
                        tags: ['technology', 'markup']
                    }
                },
                {
                    id: 'node_4',
                    label: 'Graph Theory',
                    content: '# Graph Theory\n\nGraph theory is the mathematical study of graphs, which model pairwise relations between objects.\n\n## Components\n\n- **Nodes (Vertices)**: Entities\n- **Edges (Links)**: Relationships\n- **Paths**: Sequences of edges\n- **Cycles**: Closed paths',
                    metadata: {
                        created: new Date().toISOString(),
                        tags: ['concept', 'mathematics']
                    }
                },
                {
                    id: 'node_5',
                    label: 'SPA Architecture',
                    content: '# Single Page Application\n\nA SPA is a web application that loads a single HTML page and dynamically updates content as the user interacts with the app.\n\n## Benefits\n\n- Fast user experience\n- Reduced server load\n- Smooth transitions\n- Client-side routing',
                    metadata: {
                        created: new Date().toISOString(),
                        tags: ['architecture', 'web']
                    }
                }
            ],
            edges: [
                { source: 'node_1', target: 'node_2', label: 'visualized with' },
                { source: 'node_1', target: 'node_3', label: 'content in' },
                { source: 'node_1', target: 'node_4', label: 'based on' },
                { source: 'node_2', target: 'node_4', label: 'implements' },
                { source: 'node_5', target: 'node_2', label: 'uses' },
                { source: 'node_5', target: 'node_1', label: 'displays' }
            ]
        };

        this.dataManager.setData(sampleData);
        setTimeout(() => this.graph.centerGraph(), 500);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KnowledgeGraphApp();
});
