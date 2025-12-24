/**
 * Enricher Transformer
 * Enriches nodes with additional metadata and extracted information
 */

import { BaseTransformer } from './base-transformer.js';
import { TransformationError } from '../utils/error-handler.js';

export class Enricher extends BaseTransformer {
    constructor(logger = null) {
        super(logger);
        this.type = 'enricher';
    }

    async transform(data, config = {}) {
        this.log('info', 'Starting enrichment');

        try {
            const enrichedData = {
                nodes: data.nodes.map(node => this.enrichNode(node, config)),
                edges: data.edges || []
            };

            this.log('info', 'Enrichment completed', { nodes: enrichedData.nodes.length });

            return enrichedData;

        } catch (error) {
            throw new TransformationError('Enrichment failed', { originalError: error.message });
        }
    }

    enrichNode(node, config) {
        const enriched = { ...node };

        // Ensure metadata exists
        if (!enriched.metadata) {
            enriched.metadata = {};
        }

        // Add timestamps if missing
        if (!enriched.metadata.created) {
            enriched.metadata.created = new Date().toISOString();
        }

        // Extract keywords from content
        if (config.extractKeywords !== false && enriched.content) {
            const keywords = this.extractKeywords(enriched.content);
            if (keywords.length > 0) {
                enriched.metadata.keywords = keywords;

                // Add keywords to tags if configured
                if (config.keywordsAsTags) {
                    const existingTags = new Set(enriched.metadata.tags || []);
                    keywords.forEach(kw => existingTags.add(kw));
                    enriched.metadata.tags = Array.from(existingTags);
                }
            }
        }

        // Calculate content statistics
        if (config.addStats !== false && enriched.content) {
            enriched.metadata.stats = this.calculateStats(enriched.content);
        }

        // Extract hashtags
        if (config.extractHashtags !== false && enriched.content) {
            const hashtags = this.extractHashtags(enriched.content);
            if (hashtags.length > 0) {
                enriched.metadata.hashtags = hashtags;

                // Add to tags if configured
                if (config.hashtagsAsTags !== false) {
                    const existingTags = new Set(enriched.metadata.tags || []);
                    hashtags.forEach(tag => existingTags.add(tag));
                    enriched.metadata.tags = Array.from(existingTags);
                }
            }
        }

        // Extract URLs
        if (config.extractUrls && enriched.content) {
            const urls = this.extractUrls(enriched.content);
            if (urls.length > 0) {
                enriched.metadata.urls = urls;
            }
        }

        // Generate summary
        if (config.generateSummary && enriched.content) {
            enriched.metadata.summary = this.generateSummary(enriched.content, config.summaryLength || 150);
        }

        // Auto-categorize
        if (config.autoCategories && enriched.content) {
            const categories = this.categorizeContent(enriched.content);
            if (categories.length > 0) {
                enriched.metadata.categories = categories;
            }
        }

        return enriched;
    }

    extractKeywords(content) {
        // Simple keyword extraction based on word frequency
        const stopWords = new Set([
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
            'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
            'it', 'from', 'are', 'was', 'be', 'has', 'have', 'had', 'do',
            'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might'
        ]);

        // Extract words (alphanumeric sequences)
        const words = content.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));

        // Count frequency
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });

        // Sort by frequency and take top keywords
        const keywords = Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);

        return keywords;
    }

    extractHashtags(content) {
        const hashtagPattern = /#([a-zA-Z0-9_]+)/g;
        const hashtags = [];
        let match;

        while ((match = hashtagPattern.exec(content)) !== null) {
            hashtags.push(match[1].toLowerCase());
        }

        return [...new Set(hashtags)]; // Remove duplicates
    }

    extractUrls(content) {
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const urls = [];
        let match;

        while ((match = urlPattern.exec(content)) !== null) {
            urls.push(match[1]);
        }

        return [...new Set(urls)]; // Remove duplicates
    }

    calculateStats(content) {
        // Remove markdown formatting for better counting
        const plainText = content
            .replace(/#{1,6}\s/g, '') // Remove heading markers
            .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.+?)\*/g, '$1') // Remove italic
            .replace(/`(.+?)`/g, '$1') // Remove inline code
            .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Remove links

        const words = plainText.split(/\s+/).filter(w => w.length > 0);
        const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

        return {
            characters: content.length,
            words: words.length,
            sentences: sentences.length,
            paragraphs: paragraphs.length,
            readingTime: Math.ceil(words.length / 200) // Assuming 200 words per minute
        };
    }

    generateSummary(content, maxLength) {
        // Remove markdown
        const plainText = content
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            .trim();

        // Take first paragraph or first N characters
        const firstParagraph = plainText.split(/\n\n/)[0];

        if (firstParagraph.length <= maxLength) {
            return firstParagraph;
        }

        // Truncate to maxLength at word boundary
        const truncated = plainText.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');

        return truncated.substring(0, lastSpace) + '...';
    }

    categorizeContent(content) {
        // Simple category detection based on keywords
        const categories = [];
        const lowerContent = content.toLowerCase();

        const categoryKeywords = {
            'technical': ['code', 'programming', 'software', 'api', 'function', 'class', 'method'],
            'documentation': ['guide', 'tutorial', 'how to', 'documentation', 'manual', 'reference'],
            'research': ['study', 'research', 'analysis', 'findings', 'conclusion', 'hypothesis'],
            'project': ['project', 'milestone', 'task', 'deliverable', 'timeline', 'goal'],
            'note': ['note', 'remember', 'todo', 'idea', 'thought', 'reminder']
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            const matches = keywords.filter(kw => lowerContent.includes(kw));
            if (matches.length >= 2) {
                categories.push(category);
            }
        }

        return categories;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Enrich nodes with additional metadata',
            configSchema: {
                extractKeywords: {
                    type: 'boolean',
                    default: true,
                    description: 'Extract keywords from content'
                },
                keywordsAsTags: {
                    type: 'boolean',
                    default: false,
                    description: 'Add extracted keywords as tags'
                },
                extractHashtags: {
                    type: 'boolean',
                    default: true,
                    description: 'Extract hashtags from content'
                },
                hashtagsAsTags: {
                    type: 'boolean',
                    default: true,
                    description: 'Add extracted hashtags as tags'
                },
                extractUrls: {
                    type: 'boolean',
                    default: false,
                    description: 'Extract URLs from content'
                },
                addStats: {
                    type: 'boolean',
                    default: true,
                    description: 'Add content statistics'
                },
                generateSummary: {
                    type: 'boolean',
                    default: false,
                    description: 'Generate content summary'
                },
                summaryLength: {
                    type: 'number',
                    default: 150,
                    description: 'Maximum summary length'
                },
                autoCategories: {
                    type: 'boolean',
                    default: false,
                    description: 'Auto-detect content categories'
                }
            }
        };
    }
}
