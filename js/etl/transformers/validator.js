/**
 * Validator Transformer
 * Validates data against JSON schemas
 * Note: This is a simple validator. For production, use Ajv library.
 */

import { BaseTransformer } from './base-transformer.js';
import { ValidationError } from '../utils/error-handler.js';
import { graphSchema, nodeSchema, edgeSchema } from '../utils/schemas.js';

export class Validator extends BaseTransformer {
    constructor(logger = null) {
        super(logger);
        this.type = 'validator';
    }

    async transform(data, config = {}) {
        this.log('info', 'Starting validation');

        const schema = config.schema || graphSchema;
        const errors = [];

        try {
            // Validate overall structure
            if (schema === graphSchema || config.validateGraph !== false) {
                this.validateGraphStructure(data, errors);
            }

            // Validate nodes
            if (data.nodes) {
                data.nodes.forEach((node, index) => {
                    this.validateNode(node, index, errors, config);
                });
            }

            // Validate edges
            if (data.edges) {
                data.edges.forEach((edge, index) => {
                    this.validateEdge(edge, index, errors, data.nodes, config);
                });
            }

            if (errors.length > 0) {
                throw new ValidationError('Validation failed', {
                    errorCount: errors.length,
                    errors: errors
                });
            }

            this.log('info', 'Validation completed successfully', {
                nodes: data.nodes?.length || 0,
                edges: data.edges?.length || 0
            });

            return data;

        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new ValidationError('Validation failed', { originalError: error.message });
        }
    }

    validateGraphStructure(data, errors) {
        if (!data || typeof data !== 'object') {
            errors.push({ path: 'root', message: 'Data must be an object' });
            return;
        }

        if (!data.nodes) {
            errors.push({ path: 'nodes', message: 'nodes array is required' });
        } else if (!Array.isArray(data.nodes)) {
            errors.push({ path: 'nodes', message: 'nodes must be an array' });
        }

        if (!data.edges) {
            errors.push({ path: 'edges', message: 'edges array is required' });
        } else if (!Array.isArray(data.edges)) {
            errors.push({ path: 'edges', message: 'edges must be an array' });
        }
    }

    validateNode(node, index, errors, config) {
        const path = `nodes[${index}]`;

        if (!node || typeof node !== 'object') {
            errors.push({ path, message: 'Node must be an object' });
            return;
        }

        // Required fields
        if (!node.id || typeof node.id !== 'string') {
            errors.push({ path: `${path}.id`, message: 'id is required and must be a string' });
        }

        if (!node.label || typeof node.label !== 'string' || node.label.trim() === '') {
            errors.push({ path: `${path}.label`, message: 'label is required and must be a non-empty string' });
        }

        // Optional fields
        if (node.content !== undefined && typeof node.content !== 'string') {
            errors.push({ path: `${path}.content`, message: 'content must be a string' });
        }

        // Metadata validation
        if (node.metadata) {
            if (typeof node.metadata !== 'object') {
                errors.push({ path: `${path}.metadata`, message: 'metadata must be an object' });
            } else {
                if (node.metadata.tags && !Array.isArray(node.metadata.tags)) {
                    errors.push({ path: `${path}.metadata.tags`, message: 'tags must be an array' });
                }

                if (node.metadata.created && !this.isValidDate(node.metadata.created)) {
                    errors.push({ path: `${path}.metadata.created`, message: 'created must be a valid ISO date string' });
                }

                if (node.metadata.modified && !this.isValidDate(node.metadata.modified)) {
                    errors.push({ path: `${path}.metadata.modified`, message: 'modified must be a valid ISO date string' });
                }
            }
        }
    }

    validateEdge(edge, index, errors, nodes, config) {
        const path = `edges[${index}]`;

        if (!edge || typeof edge !== 'object') {
            errors.push({ path, message: 'Edge must be an object' });
            return;
        }

        // Required fields
        if (!edge.source || typeof edge.source !== 'string') {
            errors.push({ path: `${path}.source`, message: 'source is required and must be a string' });
        }

        if (!edge.target || typeof edge.target !== 'string') {
            errors.push({ path: `${path}.target`, message: 'target is required and must be a string' });
        }

        // Validate that source and target nodes exist
        if (config.validateReferences !== false && nodes) {
            const nodeIds = new Set(nodes.map(n => n.id));

            if (edge.source && !nodeIds.has(edge.source)) {
                errors.push({ path: `${path}.source`, message: `source node '${edge.source}' does not exist` });
            }

            if (edge.target && !nodeIds.has(edge.target)) {
                errors.push({ path: `${path}.target`, message: `target node '${edge.target}' does not exist` });
            }
        }

        // Optional fields
        if (edge.label !== undefined && typeof edge.label !== 'string') {
            errors.push({ path: `${path}.label`, message: 'label must be a string' });
        }
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Validate data against JSON schemas',
            configSchema: {
                schema: {
                    type: 'object',
                    description: 'Custom schema to validate against'
                },
                validateGraph: {
                    type: 'boolean',
                    default: true
                },
                validateReferences: {
                    type: 'boolean',
                    default: true,
                    description: 'Validate that edge source/target nodes exist'
                }
            }
        };
    }
}
