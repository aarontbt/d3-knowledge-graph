/**
 * Base Transformer class
 * All transformers must extend this class
 */

import { TransformationError } from '../utils/error-handler.js';

export class BaseTransformer {
    constructor(logger = null) {
        this.logger = logger;
        this.type = 'base';
    }

    /**
     * Transform data
     * Must be implemented by subclasses
     */
    async transform(data, config = {}) {
        throw new Error('transform() must be implemented by subclass');
    }

    /**
     * Validate transformer configuration
     */
    validateConfig(config) {
        return true;
    }

    /**
     * Get transformer schema/metadata
     */
    getSchema() {
        return {
            type: this.type,
            description: 'Base transformer',
            configSchema: {}
        };
    }

    log(level, message, data = {}) {
        if (this.logger) {
            this.logger[level](message, data);
        }
    }
}
