/**
 * JSON Extractor
 * Extracts data from JSON files, URLs, or text
 */

import { BaseExtractor } from './base-extractor.js';
import { ExtractionError } from '../utils/error-handler.js';

export class JSONExtractor extends BaseExtractor {
    constructor(logger = null) {
        super(logger);
        this.type = 'json';
    }

    async extract(config) {
        this.validateConfig(config);
        this.log('info', 'Starting JSON extraction', { source: config.source });

        try {
            let jsonText;

            switch (config.source) {
                case 'file':
                    jsonText = await this.extractFromFile(config.data);
                    break;
                case 'url':
                    jsonText = await this.extractFromURL(config.data);
                    break;
                case 'text':
                    jsonText = config.data;
                    break;
                default:
                    throw new ExtractionError('Invalid source type', { source: config.source });
            }

            const data = JSON.parse(jsonText);
            this.log('info', 'JSON extraction completed', { dataSize: JSON.stringify(data).length });

            return data;

        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new ExtractionError('Invalid JSON format', { originalError: error.message });
            }
            throw new ExtractionError('JSON extraction failed', { originalError: error.message });
        }
    }

    async extractFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new ExtractionError('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    async extractFromURL(url) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new ExtractionError('Failed to fetch JSON from URL', {
                    status: response.status,
                    statusText: response.statusText
                });
            }

            return await response.text();

        } catch (error) {
            throw new ExtractionError('Failed to fetch JSON from URL', {
                url,
                error: error.message
            });
        }
    }

    validateConfig(config) {
        super.validateConfig(config);

        if (!config.source) {
            throw new ExtractionError('Source type is required (file, url, or text)');
        }

        if (!config.data) {
            throw new ExtractionError('Data is required');
        }

        return true;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Extract data from JSON files, URLs, or text',
            configSchema: {
                source: {
                    type: 'string',
                    enum: ['file', 'url', 'text'],
                    required: true
                },
                data: {
                    type: 'any',
                    required: true,
                    description: 'File object, URL string, or JSON text'
                }
            }
        };
    }
}
