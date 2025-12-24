/**
 * Batch Loader
 * Loads data in batches with progress tracking
 */

import { BaseLoader } from './base-loader.js';
import { LoadError } from '../utils/error-handler.js';
import { ProgressTracker } from '../utils/progress-tracker.js';

export class BatchLoader extends BaseLoader {
    constructor(dataManager, logger = null) {
        super(dataManager, logger);
        this.type = 'batch';
    }

    async load(data, config = {}) {
        this.validateConfig(config);
        this.log('info', 'Starting batch load', {
            nodes: data.nodes?.length || 0,
            edges: data.edges?.length || 0
        });

        const batchSize = config.batchSize || 100;
        const continueOnError = config.continueOnError || false;

        // Initialize progress tracker
        const tracker = new ProgressTracker({
            onProgress: config.onProgress
        });

        const totalItems = (data.nodes?.length || 0) + (data.edges?.length || 0);
        tracker.start(totalItems, 'loading');

        const errors = [];
        const result = {
            nodesAdded: 0,
            edgesAdded: 0,
            errors: []
        };

        try {
            // Load nodes in batches
            if (data.nodes && data.nodes.length > 0) {
                tracker.setStage('loading_nodes');
                const nodeResult = await this.loadInBatches(
                    data.nodes,
                    batchSize,
                    (node) => this.loadNode(node, config),
                    tracker,
                    continueOnError
                );

                result.nodesAdded = nodeResult.successful;
                errors.push(...nodeResult.errors);
            }

            // Load edges in batches
            if (data.edges && data.edges.length > 0) {
                tracker.setStage('loading_edges');
                const edgeResult = await this.loadInBatches(
                    data.edges,
                    batchSize,
                    (edge) => this.loadEdge(edge, config),
                    tracker,
                    continueOnError
                );

                result.edgesAdded = edgeResult.successful;
                errors.push(...edgeResult.errors);
            }

            tracker.complete();

            // Save to storage once at the end
            this.dataManager.saveToStorage();
            this.dataManager.notifyListeners();

            this.log('info', 'Batch load completed', {
                nodesAdded: result.nodesAdded,
                edgesAdded: result.edgesAdded,
                errors: errors.length
            });

            result.errors = errors;
            return result;

        } catch (error) {
            throw new LoadError('Batch load failed', {
                originalError: error.message,
                errors: errors
            });
        }
    }

    async loadInBatches(items, batchSize, loadFn, tracker, continueOnError) {
        let successful = 0;
        const errors = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, Math.min(i + batchSize, items.length));

            for (const item of batch) {
                try {
                    await loadFn(item);
                    successful++;
                    tracker.increment(true);
                } catch (error) {
                    errors.push({
                        item,
                        error: error.message
                    });
                    tracker.increment(false);

                    if (!continueOnError) {
                        throw error;
                    }
                }
            }

            // Allow UI to update between batches
            await this.delay(0);
        }

        return { successful, errors };
    }

    loadNode(node, config) {
        // Node is added directly to the data array (bypass normal addNode to avoid individual saves)
        this.dataManager.data.nodes.push(node);
    }

    loadEdge(edge, config) {
        // Validate edge references
        const nodeIds = new Set(this.dataManager.data.nodes.map(n => n.id));

        if (!nodeIds.has(edge.source)) {
            throw new LoadError(`Source node '${edge.source}' does not exist`);
        }

        if (!nodeIds.has(edge.target)) {
            throw new LoadError(`Target node '${edge.target}' does not exist`);
        }

        // Check for duplicate
        const exists = this.dataManager.data.edges.some(
            e => e.source === edge.source && e.target === edge.target
        );

        if (!exists) {
            this.dataManager.data.edges.push(edge);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    validateConfig(config) {
        super.validateConfig(config);

        if (config.batchSize && config.batchSize < 1) {
            throw new LoadError('Batch size must be at least 1');
        }

        return true;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Load data in batches with progress tracking',
            configSchema: {
                batchSize: {
                    type: 'number',
                    default: 100,
                    description: 'Number of items to process per batch'
                },
                continueOnError: {
                    type: 'boolean',
                    default: false,
                    description: 'Continue loading even if errors occur'
                },
                onProgress: {
                    type: 'function',
                    description: 'Progress callback function'
                }
            }
        };
    }
}
