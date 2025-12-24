/**
 * Merge Strategy Loader
 * Loads data with various merge strategies
 */

import { BaseLoader } from './base-loader.js';
import { LoadError } from '../utils/error-handler.js';

export class MergeStrategy extends BaseLoader {
    constructor(dataManager, logger = null) {
        super(dataManager, logger);
        this.type = 'merge-strategy';
    }

    async load(data, config = {}) {
        this.validateConfig(config);

        const strategy = config.strategy || 'merge';
        this.log('info', `Starting load with ${strategy} strategy`, {
            nodes: data.nodes?.length || 0,
            edges: data.edges?.length || 0
        });

        try {
            let result;

            switch (strategy) {
                case 'replace':
                    result = await this.replaceStrategy(data, config);
                    break;
                case 'merge':
                    result = await this.mergeStrategy(data, config);
                    break;
                case 'update':
                    result = await this.updateStrategy(data, config);
                    break;
                case 'append':
                    result = await this.appendStrategy(data, config);
                    break;
                default:
                    throw new LoadError(`Unknown strategy: ${strategy}`);
            }

            this.dataManager.saveToStorage();
            this.dataManager.notifyListeners();

            this.log('info', 'Load completed', result);

            return result;

        } catch (error) {
            throw new LoadError('Merge strategy load failed', {
                strategy,
                originalError: error.message
            });
        }
    }

    /**
     * Replace: Clear all existing data and load new data
     */
    async replaceStrategy(data, config) {
        this.log('info', 'Replacing all existing data');

        this.dataManager.data = {
            nodes: data.nodes || [],
            edges: data.edges || []
        };

        return {
            strategy: 'replace',
            nodesTotal: data.nodes?.length || 0,
            edgesTotal: data.edges?.length || 0
        };
    }

    /**
     * Merge: Combine with existing data, avoiding duplicates
     */
    async mergeStrategy(data, config) {
        this.log('info', 'Merging with existing data');

        const existingNodeIds = new Set(this.dataManager.data.nodes.map(n => n.id));
        const existingEdgeKeys = new Set(
            this.dataManager.data.edges.map(e => `${e.source}::${e.target}`)
        );

        let nodesAdded = 0;
        let nodesUpdated = 0;
        let edgesAdded = 0;

        // Merge nodes
        for (const node of (data.nodes || [])) {
            if (existingNodeIds.has(node.id)) {
                // Update existing node
                const index = this.dataManager.data.nodes.findIndex(n => n.id === node.id);
                if (index !== -1) {
                    this.dataManager.data.nodes[index] = this.mergeNode(
                        this.dataManager.data.nodes[index],
                        node,
                        config
                    );
                    nodesUpdated++;
                }
            } else {
                // Add new node
                this.dataManager.data.nodes.push(node);
                existingNodeIds.add(node.id);
                nodesAdded++;
            }
        }

        // Merge edges
        for (const edge of (data.edges || [])) {
            const key = `${edge.source}::${edge.target}`;

            // Only add edge if both nodes exist
            if (existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)) {
                if (!existingEdgeKeys.has(key)) {
                    this.dataManager.data.edges.push(edge);
                    existingEdgeKeys.add(key);
                    edgesAdded++;
                }
            }
        }

        return {
            strategy: 'merge',
            nodesAdded,
            nodesUpdated,
            edgesAdded,
            nodesTotal: this.dataManager.data.nodes.length,
            edgesTotal: this.dataManager.data.edges.length
        };
    }

    /**
     * Update: Update existing nodes, add new ones
     */
    async updateStrategy(data, config) {
        this.log('info', 'Updating existing data');

        const existingNodeIds = new Set(this.dataManager.data.nodes.map(n => n.id));
        const existingEdgeKeys = new Set(
            this.dataManager.data.edges.map(e => `${e.source}::${e.target}`)
        );

        let nodesAdded = 0;
        let nodesUpdated = 0;
        let edgesAdded = 0;

        // Update or add nodes
        for (const node of (data.nodes || [])) {
            if (existingNodeIds.has(node.id)) {
                // Update existing
                const index = this.dataManager.data.nodes.findIndex(n => n.id === node.id);
                if (index !== -1) {
                    this.dataManager.data.nodes[index] = {
                        ...node,
                        metadata: {
                            ...this.dataManager.data.nodes[index].metadata,
                            ...node.metadata,
                            modified: new Date().toISOString()
                        }
                    };
                    nodesUpdated++;
                }
            } else {
                // Add new
                this.dataManager.data.nodes.push(node);
                existingNodeIds.add(node.id);
                nodesAdded++;
            }
        }

        // Add new edges
        for (const edge of (data.edges || [])) {
            const key = `${edge.source}::${edge.target}`;

            if (existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)) {
                if (!existingEdgeKeys.has(key)) {
                    this.dataManager.data.edges.push(edge);
                    existingEdgeKeys.add(key);
                    edgesAdded++;
                }
            }
        }

        return {
            strategy: 'update',
            nodesAdded,
            nodesUpdated,
            edgesAdded,
            nodesTotal: this.dataManager.data.nodes.length,
            edgesTotal: this.dataManager.data.edges.length
        };
    }

    /**
     * Append: Only add new nodes/edges, skip existing
     */
    async appendStrategy(data, config) {
        this.log('info', 'Appending new data only');

        const existingNodeIds = new Set(this.dataManager.data.nodes.map(n => n.id));
        const existingEdgeKeys = new Set(
            this.dataManager.data.edges.map(e => `${e.source}::${e.target}`)
        );

        let nodesAdded = 0;
        let nodesSkipped = 0;
        let edgesAdded = 0;
        let edgesSkipped = 0;

        // Add new nodes only
        for (const node of (data.nodes || [])) {
            if (!existingNodeIds.has(node.id)) {
                this.dataManager.data.nodes.push(node);
                existingNodeIds.add(node.id);
                nodesAdded++;
            } else {
                nodesSkipped++;
            }
        }

        // Add new edges only
        for (const edge of (data.edges || [])) {
            const key = `${edge.source}::${edge.target}`;

            if (existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)) {
                if (!existingEdgeKeys.has(key)) {
                    this.dataManager.data.edges.push(edge);
                    existingEdgeKeys.add(key);
                    edgesAdded++;
                } else {
                    edgesSkipped++;
                }
            }
        }

        return {
            strategy: 'append',
            nodesAdded,
            nodesSkipped,
            edgesAdded,
            edgesSkipped,
            nodesTotal: this.dataManager.data.nodes.length,
            edgesTotal: this.dataManager.data.edges.length
        };
    }

    /**
     * Merge two nodes
     */
    mergeNode(existing, incoming, config) {
        const mergeStrategy = config.mergeStrategy || 'prefer-new';

        let merged = { ...existing };

        // Merge based on strategy
        if (mergeStrategy === 'prefer-new') {
            merged = {
                ...existing,
                ...incoming,
                metadata: {
                    ...existing.metadata,
                    ...incoming.metadata,
                    created: existing.metadata.created, // Keep original created date
                    modified: new Date().toISOString()
                }
            };
        } else if (mergeStrategy === 'prefer-existing') {
            merged = {
                ...incoming,
                ...existing,
                metadata: {
                    ...incoming.metadata,
                    ...existing.metadata,
                    modified: new Date().toISOString()
                }
            };
        } else if (mergeStrategy === 'combine') {
            // Combine content and tags
            merged.content = existing.content && incoming.content && existing.content !== incoming.content
                ? existing.content + '\n\n---\n\n' + incoming.content
                : incoming.content || existing.content;

            const tags = new Set([
                ...(existing.metadata?.tags || []),
                ...(incoming.metadata?.tags || [])
            ]);

            merged.metadata = {
                ...existing.metadata,
                ...incoming.metadata,
                tags: Array.from(tags),
                created: existing.metadata.created,
                modified: new Date().toISOString()
            };
        }

        return merged;
    }

    validateConfig(config) {
        super.validateConfig(config);

        const validStrategies = ['replace', 'merge', 'update', 'append'];
        if (config.strategy && !validStrategies.includes(config.strategy)) {
            throw new LoadError(`Invalid strategy. Must be one of: ${validStrategies.join(', ')}`);
        }

        return true;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Load data with various merge strategies',
            configSchema: {
                strategy: {
                    type: 'string',
                    enum: ['replace', 'merge', 'update', 'append'],
                    default: 'merge',
                    description: 'Merge strategy to use'
                },
                mergeStrategy: {
                    type: 'string',
                    enum: ['prefer-new', 'prefer-existing', 'combine'],
                    default: 'prefer-new',
                    description: 'How to merge conflicting nodes'
                }
            }
        };
    }
}
