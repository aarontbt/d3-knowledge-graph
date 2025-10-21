/**
 * Graph Visualization Module
 * Handles D3.js force-directed graph rendering and interactions
 */

export class GraphVisualizer {
    constructor(svgSelector, options = {}) {
        this.svg = d3.select(svgSelector);
        this.width = options.width || window.innerWidth;
        this.height = options.height || window.innerHeight;

        // Graph data
        this.nodes = [];
        this.edges = [];

        // Selected node
        this.selectedNode = null;

        // Callbacks
        this.onNodeClick = options.onNodeClick || (() => {});
        this.onNodeDoubleClick = options.onNodeDoubleClick || (() => {});

        // Initialize SVG
        this.initSVG();

        // Initialize force simulation
        this.initSimulation();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    initSVG() {
        // Clear existing content
        this.svg.selectAll('*').remove();

        // Create container group for zoom
        this.container = this.svg.append('g');

        // Add zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.container.attr('transform', event.transform);
            });

        this.svg.call(this.zoom);

        // Create groups for edges and nodes (order matters for z-index)
        this.edgeGroup = this.container.append('g').attr('class', 'edges');
        this.edgeLabelGroup = this.container.append('g').attr('class', 'edge-labels');
        this.nodeGroup = this.container.append('g').attr('class', 'nodes');
    }

    initSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(50));
    }

    setData(nodes, edges) {
        // Deep copy to avoid mutations
        this.nodes = JSON.parse(JSON.stringify(nodes));
        this.edges = JSON.parse(JSON.stringify(edges));

        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.edges);

        // Render
        this.render();
    }

    render() {
        // Render edges
        const linkElements = this.edgeGroup
            .selectAll('line')
            .data(this.edges, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
            .join('line')
            .attr('class', 'link')
            .attr('marker-end', 'url(#arrowhead)');

        // Render edge labels
        const linkLabelElements = this.edgeLabelGroup
            .selectAll('text')
            .data(this.edges, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
            .join('text')
            .attr('class', 'link-label')
            .attr('text-anchor', 'middle')
            .text(d => d.label || '');

        // Render nodes
        const nodeElements = this.nodeGroup
            .selectAll('g.node')
            .data(this.nodes, d => d.id)
            .join('g')
            .attr('class', 'node')
            .call(this.drag());

        // Remove existing circles and text
        nodeElements.selectAll('*').remove();

        // Add circles
        nodeElements.append('circle')
            .attr('r', 20)
            .on('click', (event, d) => this.handleNodeClick(event, d))
            .on('dblclick', (event, d) => this.handleNodeDoubleClick(event, d));

        // Add labels
        nodeElements.append('text')
            .attr('dy', 35)
            .attr('text-anchor', 'middle')
            .text(d => d.label);

        // Update simulation
        this.simulation.on('tick', () => {
            linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            linkLabelElements
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);

            nodeElements
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Restart simulation
        this.simulation.alpha(1).restart();
    }

    handleNodeClick(event, node) {
        event.stopPropagation();

        // Deselect previous node
        if (this.selectedNode) {
            this.nodeGroup
                .selectAll('g.node')
                .filter(d => d.id === this.selectedNode.id)
                .classed('selected', false);
        }

        // Select new node
        this.selectedNode = node;
        this.nodeGroup
            .selectAll('g.node')
            .filter(d => d.id === node.id)
            .classed('selected', true);

        // Trigger callback
        this.onNodeClick(node);
    }

    handleNodeDoubleClick(event, node) {
        event.stopPropagation();
        this.onNodeDoubleClick(node);
    }

    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    zoomIn() {
        this.svg.transition().call(this.zoom.scaleBy, 1.3);
    }

    zoomOut() {
        this.svg.transition().call(this.zoom.scaleBy, 0.7);
    }

    resetZoom() {
        this.svg.transition().call(
            this.zoom.transform,
            d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(1)
        );
    }

    centerGraph() {
        const bounds = this.container.node().getBBox();
        const fullWidth = this.width;
        const fullHeight = this.height;
        const width = bounds.width;
        const height = bounds.height;
        const midX = bounds.x + width / 2;
        const midY = bounds.y + height / 2;

        if (width === 0 || height === 0) return;

        const scale = 0.9 / Math.max(width / fullWidth, height / fullHeight);
        const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

        this.svg.transition().duration(750).call(
            this.zoom.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    }

    highlightNode(nodeId) {
        // Deselect previous
        this.nodeGroup.selectAll('g.node').classed('selected', false);

        // Select new
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            this.selectedNode = node;
            this.nodeGroup
                .selectAll('g.node')
                .filter(d => d.id === nodeId)
                .classed('selected', true);
        }
    }

    search(query) {
        const lowerQuery = query.toLowerCase();
        const matches = this.nodes.filter(node =>
            node.label.toLowerCase().includes(lowerQuery) ||
            (node.content && node.content.toLowerCase().includes(lowerQuery)) ||
            (node.metadata && node.metadata.tags &&
                node.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
        );

        return matches;
    }

    handleResize() {
        const container = this.svg.node().parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(0.3).restart();
    }

    getStats() {
        return {
            nodeCount: this.nodes.length,
            edgeCount: this.edges.length
        };
    }

    clearSelection() {
        this.selectedNode = null;
        this.nodeGroup.selectAll('g.node').classed('selected', false);
    }
}
