/**
 * Deduplicator Transformer
 * Removes or merges duplicate nodes
 */

import { BaseTransformer } from './base-transformer.js';
import { TransformationError } from '../utils/error-handler.js';

export class Deduplicator extends BaseTransformer {
    constructor(logger = null) {
        super(logger);
        this.type = 'deduplicator';
    }

    async transform(data, config = {}) {
        this.log('info', 'Starting deduplication');

        try {
            const result = {
                nodes: this.deduplicateNodes(data.nodes || [], config),
                edges: data.edges || []
            };

            // Update edge references if nodes were merged
            if (this.nodeIdMapping && Object.keys(this.nodeIdMapping).length > 0) {
                result.edges = this.updateEdgeReferences(result.edges);
            }

            // Deduplicate edges
            result.edges = this.deduplicateEdges(result.edges);

            const removedNodes = (data.nodes?.length || 0) - result.nodes.length;
            const removedEdges = (data.edges?.length || 0) - result.edges.length;

            this.log('info', 'Deduplication completed', {
                removedNodes,
                removedEdges,
                finalNodes: result.nodes.length,
                finalEdges: result.edges.length
            });

            return result;

        } catch (error) {
            throw new TransformationError('Deduplication failed', { originalError: error.message });
        }
    }

    deduplicateNodes(nodes, config) {
        const by = config.by || 'id';
        const strategy = config.strategy || 'skip';
        const caseSensitive = config.caseSensitive !== false;

        const uniqueNodes = [];
        const seen = new Map();
        this.nodeIdMapping = {};

        for (const node of nodes) {
            let key = this.getKey(node, by, caseSensitive);

            if (seen.has(key)) {
                // Duplicate found
                const existingNode = seen.get(key);

                switch (strategy) {
                    case 'skip':
                        // Keep existing, skip new
                        this.nodeIdMapping[node.id] = existingNode.id;
                        this.log('debug', 'Skipping duplicate node', { nodeId: node.id, key });
                        break;

                    case 'overwrite':
                        // Replace existing with new
                        const index = uniqueNodes.findIndex(n => n.id === existingNode.id);
                        if (index !== -1) {
                            this.nodeIdMapping[existingNode.id] = node.id;
                            uniqueNodes[index] = node;
                            seen.set(key, node);
                            this.log('debug', 'Overwriting duplicate node', { nodeId: node.id, key });
                        }
                        break;

                    case 'merge':
                        // Merge properties
                        const index2 = uniqueNodes.findIndex(n => n.id === existingNode.id);
                        if (index2 !== -1) {
                            uniqueNodes[index2] = this.mergeNodes(existingNode, node, config);
                            seen.set(key, uniqueNodes[index2]);
                            this.nodeIdMapping[node.id] = existingNode.id;
                            this.log('debug', 'Merging duplicate node', { nodeId: node.id, key });
                        }
                        break;

                    default:
                        this.log('warn', 'Unknown deduplication strategy', { strategy });
                        break;
                }
            } else {
                // New unique node
                seen.set(key, node);
                uniqueNodes.push(node);
            }
        }

        return uniqueNodes;
    }

    getKey(node, by, caseSensitive) {
        let key;

        switch (by) {
            case 'id':
                key = node.id;
                break;
            case 'label':
                key = node.label;
                break;
            case 'content':
                key = this.hashContent(node.content || '');
                break;
            case 'label+content':
                key = node.label + '::' + this.hashContent(node.content || '');
                break;
            default:
                key = node[by];
                break;
        }

        return caseSensitive ? key : String(key).toLowerCase();
    }

    hashContent(content) {
        // Simple hash function for content comparison
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    mergeNodes(existing, incoming, config) {
        const mergeStrategy = config.mergeStrategy || 'combine';

        const merged = { ...existing };

        // Merge content
        if (incoming.content) {
            if (mergeStrategy === 'combine') {
                // Combine content if different
                if (existing.content && existing.content !== incoming.content) {
                    merged.content = existing.content + '\n\n---\n\n' + incoming.content;
                } else {
                    merged.content = incoming.content;
                }
            } else if (mergeStrategy === 'newest') {
                // Use incoming (newer) content
                merged.content = incoming.content;
            }
            // 'keep' strategy keeps existing content (default behavior)
        }

        // Merge metadata
        if (incoming.metadata) {
            merged.metadata = { ...existing.metadata };

            // Merge tags
            if (incoming.metadata.tags) {
                const combinedTags = new Set([
                    ...(existing.metadata.tags || []),
                    ...incoming.metadata.tags
                ]);
                merged.metadata.tags = Array.from(combinedTags);
            }

            // Use most recent timestamp
            if (incoming.metadata.modified) {
                const existingTime = existing.metadata.modified
                    ? new Date(existing.metadata.modified).getTime()
                    : 0;
                const incomingTime = new Date(incoming.metadata.modified).getTime();

                if (incomingTime > existingTime) {
                    merged.metadata.modified = incoming.metadata.modified;
                }
            }

            // Merge other metadata properties
            for (const [key, value] of Object.entries(incoming.metadata)) {
                if (!['tags', 'created', 'modified'].includes(key)) {
                    if (!merged.metadata[key]) {
                        merged.metadata[key] = value;
                    } else if (Array.isArray(value) && Array.isArray(merged.metadata[key])) {
                        // Combine arrays
                        merged.metadata[key] = [...new Set([...merged.metadata[key], ...value])];
                    }
                }
            }
        }

        return merged;
    }

    updateEdgeReferences(edges) {
        return edges.map(edge => ({
            ...edge,
            source: this.nodeIdMapping[edge.source] || edge.source,
            target: this.nodeIdMapping[edge.target] || edge.target
        }));
    }

    deduplicateEdges(edges) {
        const uniqueEdges = [];
        const seen = new Set();

        for (const edge of edges) {
            const key = `${edge.source}::${edge.target}`;

            if (!seen.has(key)) {
                seen.add(key);
                uniqueEdges.push(edge);
            }
        }

        return uniqueEdges;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Remove or merge duplicate nodes',
            configSchema: {
                by: {
                    type: 'string',
                    enum: ['id', 'label', 'content', 'label+content'],
                    default: 'id',
                    description: 'Field to use for duplicate detection'
                },
                strategy: {
                    type: 'string',
                    enum: ['skip', 'overwrite', 'merge'],
                    default: 'skip',
                    description: 'How to handle duplicates'
                },
                mergeStrategy: {
                    type: 'string',
                    enum: ['keep', 'newest', 'combine'],
                    default: 'combine',
                    description: 'How to merge node content when using merge strategy'
                },
                caseSensitive: {
                    type: 'boolean',
                    default: false,
                    description: 'Case-sensitive comparison'
                }
            }
        };
    }
}
