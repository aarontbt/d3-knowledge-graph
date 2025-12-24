/**
 * Base Extractor class
 * All extractors must extend this class
 */

import { ExtractionError } from '../utils/error-handler.js';

export class BaseExtractor {
    constructor(logger = null) {
        this.logger = logger;
        this.type = 'base';
    }

    /**
     * Extract data from source
     * Must be implemented by subclasses
     */
    async extract(config) {
        throw new Error('extract() must be implemented by subclass');
    }

    /**
     * Validate extractor configuration
     * Can be overridden by subclasses
     */
    validateConfig(config) {
        if (!config) {
            throw new ExtractionError('Configuration is required');
        }
        return true;
    }

    /**
     * Get extractor schema/metadata
     */
    getSchema() {
        return {
            type: this.type,
            description: 'Base extractor',
            configSchema: {}
        };
    }

    log(level, message, data = {}) {
        if (this.logger) {
            this.logger[level](message, data);
        }
    }
}
