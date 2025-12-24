/**
 * Normalizer Transformer
 * Normalizes data to match the expected schema
 */

import { BaseTransformer } from './base-transformer.js';
import { TransformationError } from '../utils/error-handler.js';

export class Normalizer extends BaseTransformer {
    constructor(logger = null) {
        super(logger);
        this.type = 'normalizer';
    }

    async transform(data, config = {}) {
        this.log('info', 'Starting normalization');

        try {
            let result = { nodes: [], edges: [] };

            // Handle different input formats
            if (Array.isArray(data)) {
                // Array of items - treat as nodes
                result.nodes = data.map(item => this.normalizeNode(item, config));
                result.edges = [];
            } else if (data.nodes || data.edges) {
                // Graph structure
                result.nodes = (data.nodes || []).map(node => this.normalizeNode(node, config));
                result.edges = (data.edges || []).map(edge => this.normalizeEdge(edge, config));
            } else {
                // Single object - treat as a node
                result.nodes = [this.normalizeNode(data, config)];
                result.edges = [];
            }

            this.log('info', 'Normalization completed', {
                nodes: result.nodes.length,
                edges: result.edges.length
            });

            return result;

        } catch (error) {
            throw new TransformationError('Normalization failed', { originalError: error.message });
        }
    }

    normalizeNode(node, config) {
        const normalized = {};

        // ID generation or mapping
        if (node.id) {
            normalized.id = String(node.id);
        } else if (config.generateIds !== false) {
            normalized.id = this.generateId();
        }

        // Label mapping
        normalized.label = this.getField(node, config.labelField || 'label', config.fieldMapping)
            || this.getField(node, 'title', config.fieldMapping)
            || this.getField(node, 'name', config.fieldMapping)
            || 'Untitled';

        normalized.label = String(normalized.label).trim();

        // Content mapping
        normalized.content = this.getField(node, config.contentField || 'content', config.fieldMapping)
            || this.getField(node, 'description', config.fieldMapping)
            || this.getField(node, 'body', config.fieldMapping)
            || '';

        normalized.content = String(normalized.content);

        // Metadata
        normalized.metadata = {
            created: new Date().toISOString(),
            ...node.metadata
        };

        // Tags
        const tags = this.getField(node, 'tags', config.fieldMapping)
            || this.getField(node, 'categories', config.fieldMapping)
            || this.getField(node, 'keywords', config.fieldMapping)
            || [];

        normalized.metadata.tags = this.normalizeTags(tags);

        // Apply field mapping
        if (config.fieldMapping) {
            for (const [sourceField, targetField] of Object.entries(config.fieldMapping)) {
                if (node.hasOwnProperty(sourceField) && !targetField.startsWith('metadata.')) {
                    this.setNestedProperty(normalized, targetField, node[sourceField]);
                } else if (targetField.startsWith('metadata.')) {
                    const metadataField = targetField.substring(9); // Remove 'metadata.'
                    if (node.hasOwnProperty(sourceField)) {
                        normalized.metadata[metadataField] = node[sourceField];
                    }
                }
            }
        }

        // Apply defaults
        if (config.defaults) {
            for (const [field, value] of Object.entries(config.defaults)) {
                if (!this.getNestedProperty(normalized, field)) {
                    this.setNestedProperty(normalized, field, value);
                }
            }
        }

        return normalized;
    }

    normalizeEdge(edge, config) {
        return {
            source: String(edge.source || edge.from || edge.source_id),
            target: String(edge.target || edge.to || edge.target_id),
            label: edge.label || edge.type || edge.relationship || ''
        };
    }

    normalizeTags(tags) {
        if (!tags) return [];
        if (typeof tags === 'string') {
            // Split by comma, semicolon, or pipe
            return tags.split(/[,;|]/).map(t => t.trim()).filter(t => t.length > 0);
        }
        if (Array.isArray(tags)) {
            return tags.map(t => String(t).trim()).filter(t => t.length > 0);
        }
        return [];
    }

    getField(obj, field, mapping) {
        // Check if there's a mapping for this field
        if (mapping && mapping[field]) {
            field = mapping[field];
        }

        return this.getNestedProperty(obj, field);
    }

    getNestedProperty(obj, path) {
        if (!path) return undefined;

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return undefined;
            }
        }

        return current;
    }

    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }

    generateId() {
        return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Normalize data to match the expected schema',
            configSchema: {
                fieldMapping: {
                    type: 'object',
                    description: 'Map source fields to target fields'
                },
                labelField: {
                    type: 'string',
                    default: 'label',
                    description: 'Field to use for node label'
                },
                contentField: {
                    type: 'string',
                    default: 'content',
                    description: 'Field to use for node content'
                },
                generateIds: {
                    type: 'boolean',
                    default: true,
                    description: 'Generate IDs for nodes without IDs'
                },
                defaults: {
                    type: 'object',
                    description: 'Default values for fields'
                }
            }
        };
    }
}
