/**
 * Base Loader class
 * All loaders must extend this class
 */

import { LoadError } from '../utils/error-handler.js';

export class BaseLoader {
    constructor(dataManager, logger = null) {
        this.dataManager = dataManager;
        this.logger = logger;
        this.type = 'base';
    }

    /**
     * Load data into the data manager
     * Must be implemented by subclasses
     */
    async load(data, config = {}) {
        throw new Error('load() must be implemented by subclass');
    }

    /**
     * Validate loader configuration
     */
    validateConfig(config) {
        return true;
    }

    /**
     * Get loader schema/metadata
     */
    getSchema() {
        return {
            type: this.type,
            description: 'Base loader',
            configSchema: {}
        };
    }

    log(level, message, data = {}) {
        if (this.logger) {
            this.logger[level](message, data);
        }
    }
}
