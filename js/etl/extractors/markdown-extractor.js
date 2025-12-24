/**
 * Markdown Extractor
 * Extracts nodes from Markdown files
 */

import { BaseExtractor } from './base-extractor.js';
import { ExtractionError } from '../utils/error-handler.js';
import { validateFile } from '../utils/security.js';

export class MarkdownExtractor extends BaseExtractor {
    constructor(logger = null) {
        super(logger);
        this.type = 'markdown';
    }

    async extract(config) {
        this.validateConfig(config);
        this.log('info', 'Starting Markdown extraction', { fileCount: config.files.length });

        try {
            const nodes = [];
            const edges = [];

            for (const file of config.files) {
                const result = await this.extractFromFile(file, config);
                nodes.push(result.node);
                if (result.edges) {
                    edges.push(...result.edges);
                }
            }

            this.log('info', 'Markdown extraction completed', {
                nodes: nodes.length,
                edges: edges.length
            });

            return { nodes, edges };

        } catch (error) {
            throw new ExtractionError('Markdown extraction failed', {
                originalError: error.message
            });
        }
    }

    async extractFromFile(file, config) {
        // Validate file
        const fileValidation = validateFile(file, {
            maxSize: 10 * 1024 * 1024, // 10MB max for markdown
            allowedTypes: ['text/markdown', 'text/plain'],
            allowedExtensions: ['md', 'markdown', 'txt']
        });

        if (!fileValidation.valid) {
            throw new ExtractionError('File validation failed', {
                filename: file.name,
                error: fileValidation.error
            });
        }

        const content = await this.readFile(file);
        const metadata = config.extractMetadata ? this.extractFrontmatter(content) : {};

        // Extract content (remove frontmatter if present)
        let markdownContent = content;
        if (config.extractMetadata && content.startsWith('---')) {
            const endIndex = content.indexOf('---', 3);
            if (endIndex !== -1) {
                markdownContent = content.substring(endIndex + 3).trim();
            }
        }

        // Generate node
        const node = {
            id: this.generateIdFromFilename(file.name),
            label: metadata.title || this.extractTitleFromFilename(file.name),
            content: markdownContent,
            metadata: {
                created: new Date().toISOString(),
                tags: metadata.tags || [],
                sourceFile: file.name,
                ...metadata
            }
        };

        // Extract edges from links
        let edges = [];
        if (config.generateEdges) {
            edges = this.extractLinks(node.id, markdownContent, config.linkPattern);
        }

        return { node, edges };
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new ExtractionError('Failed to read file', { filename: file.name }));
            };

            reader.readAsText(file);
        });
    }

    extractFrontmatter(content) {
        if (!content.startsWith('---')) {
            return {};
        }

        const endIndex = content.indexOf('---', 3);
        if (endIndex === -1) {
            return {};
        }

        const frontmatter = content.substring(3, endIndex).trim();
        const metadata = {};

        // Simple YAML-like parsing
        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();

                // Handle arrays (tags: [tag1, tag2] or tags: tag1, tag2)
                if (value.startsWith('[') && value.endsWith(']')) {
                    value = value.slice(1, -1).split(',').map(v => v.trim());
                } else if (key === 'tags' && value.includes(',')) {
                    value = value.split(',').map(v => v.trim());
                }

                metadata[key] = value;
            }
        });

        return metadata;
    }

    extractLinks(sourceId, content, linkPattern) {
        const edges = [];
        const pattern = linkPattern || /\[\[(.+?)\]\]/g;
        let match;

        while ((match = pattern.exec(content)) !== null) {
            const targetLabel = match[1];
            const targetId = this.generateIdFromLabel(targetLabel);

            edges.push({
                source: sourceId,
                target: targetId,
                label: 'links to'
            });
        }

        return edges;
    }

    generateIdFromFilename(filename) {
        // Remove extension and convert to ID
        const name = filename.replace(/\.[^/.]+$/, '');
        return 'node_' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    generateIdFromLabel(label) {
        return 'node_' + label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    extractTitleFromFilename(filename) {
        // Remove extension and capitalize
        let title = filename.replace(/\.[^/.]+$/, '');
        title = title.replace(/[-_]/g, ' ');
        return title.charAt(0).toUpperCase() + title.slice(1);
    }

    validateConfig(config) {
        super.validateConfig(config);

        if (!config.files || config.files.length === 0) {
            throw new ExtractionError('At least one file is required');
        }

        return true;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Extract nodes from Markdown files',
            configSchema: {
                files: {
                    type: 'FileList',
                    required: true
                },
                extractMetadata: {
                    type: 'boolean',
                    default: true,
                    description: 'Extract frontmatter metadata'
                },
                generateEdges: {
                    type: 'boolean',
                    default: true,
                    description: 'Generate edges from wiki-style links'
                },
                linkPattern: {
                    type: 'RegExp',
                    default: '/\\[\\[(.+?)\\]\\]/g',
                    description: 'Pattern to match links'
                }
            }
        };
    }
}
