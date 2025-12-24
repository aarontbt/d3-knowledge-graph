/**
 * ETL Manager
 * Orchestrates the Extract, Transform, Load pipeline
 */

import { Logger, LogLevel } from './utils/logger.js';
import { ErrorHandler } from './utils/error-handler.js';
import { ProgressTracker } from './utils/progress-tracker.js';

// Extractors
import { JSONExtractor } from './extractors/json-extractor.js';
import { CSVExtractor } from './extractors/csv-extractor.js';
import { APIExtractor } from './extractors/api-extractor.js';
import { MarkdownExtractor } from './extractors/markdown-extractor.js';

// Transformers
import { Validator } from './transformers/validator.js';
import { Normalizer } from './transformers/normalizer.js';
import { Enricher } from './transformers/enricher.js';
import { Deduplicator } from './transformers/deduplicator.js';

// Loaders
import { BatchLoader } from './loaders/batch-loader.js';
import { MergeStrategy } from './loaders/merge-strategy.js';

export class ETLManager {
    constructor(dataManager, options = {}) {
        this.dataManager = dataManager;

        // Initialize utilities
        this.logger = new Logger({
            level: options.logLevel || LogLevel.INFO,
            prefix: '[ETL]'
        });

        this.errorHandler = new ErrorHandler({
            continueOnError: options.continueOnError || false
        });

        this.progressTracker = new ProgressTracker();

        // Registry of components
        this.extractors = new Map();
        this.transformers = new Map();
        this.loaders = new Map();

        // Register default extractors
        this.registerExtractor('json', JSONExtractor);
        this.registerExtractor('csv', CSVExtractor);
        this.registerExtractor('api', APIExtractor);
        this.registerExtractor('markdown', MarkdownExtractor);

        // Register default transformers
        this.registerTransformer('validator', Validator);
        this.registerTransformer('normalizer', Normalizer);
        this.registerTransformer('enricher', Enricher);
        this.registerTransformer('deduplicator', Deduplicator);

        // Register default loaders
        this.registerLoader('batch', BatchLoader);
        this.registerLoader('merge-strategy', MergeStrategy);

        // Event listeners
        this.listeners = {
            progress: [],
            stage: [],
            complete: [],
            error: []
        };

        // State
        this.isRunning = false;
        this.isPaused = false;
        this.shouldCancel = false;
    }

    /**
     * Execute ETL pipeline
     */
    async execute(config) {
        if (this.isRunning) {
            throw new Error('ETL pipeline is already running');
        }

        this.isRunning = true;
        this.shouldCancel = false;
        this.errorHandler.clear();
        this.logger.info('Starting ETL pipeline', { config });

        try {
            // Validate configuration
            this.validateConfig(config);

            // EXTRACT
            this.emit('stage', 'extract');
            const rawData = await this.extract(config.source);

            if (this.shouldCancel) {
                throw new Error('ETL pipeline cancelled');
            }

            // TRANSFORM
            this.emit('stage', 'transform');
            const transformedData = await this.transform(rawData, config.transformers || []);

            if (this.shouldCancel) {
                throw new Error('ETL pipeline cancelled');
            }

            // LOAD
            this.emit('stage', 'load');
            let result;

            if (config.options?.dryRun) {
                this.logger.info('Dry run - skipping load', {
                    nodes: transformedData.nodes?.length || 0,
                    edges: transformedData.edges?.length || 0
                });
                result = {
                    dryRun: true,
                    preview: {
                        nodes: transformedData.nodes?.slice(0, 10) || [],
                        edges: transformedData.edges?.slice(0, 10) || [],
                        totalNodes: transformedData.nodes?.length || 0,
                        totalEdges: transformedData.edges?.length || 0
                    }
                };
            } else {
                result = await this.load(transformedData, config.loader || {});
            }

            // Complete
            this.logger.info('ETL pipeline completed successfully', result);
            this.emit('complete', {
                success: true,
                result,
                errors: this.errorHandler.getErrors(),
                warnings: this.errorHandler.getWarnings()
            });

            return {
                success: true,
                result,
                logs: this.logger.getLogs(),
                errors: this.errorHandler.getSummary()
            };

        } catch (error) {
            this.logger.error('ETL pipeline failed', { error: error.message });
            this.errorHandler.handleError(error);
            this.emit('error', error);

            return {
                success: false,
                error: error.message,
                logs: this.logger.getLogs(),
                errors: this.errorHandler.getSummary()
            };

        } finally {
            this.isRunning = false;
            this.isPaused = false;
        }
    }

    /**
     * Extract phase
     */
    async extract(sourceConfig) {
        this.logger.info('Starting extraction', { type: sourceConfig.type });

        const ExtractorClass = this.extractors.get(sourceConfig.type);
        if (!ExtractorClass) {
            throw new Error(`Unknown extractor type: ${sourceConfig.type}`);
        }

        const extractor = new ExtractorClass(this.logger);
        const data = await extractor.extract(sourceConfig.config);

        this.logger.info('Extraction completed');
        return data;
    }

    /**
     * Transform phase
     */
    async transform(data, transformerConfigs) {
        this.logger.info('Starting transformation', { transformers: transformerConfigs.length });

        let currentData = data;

        for (const transformerConfig of transformerConfigs) {
            const type = transformerConfig.type || transformerConfig;

            this.logger.info(`Applying transformer: ${type}`);

            const TransformerClass = this.transformers.get(type);
            if (!TransformerClass) {
                this.logger.warn(`Unknown transformer type: ${type}, skipping`);
                continue;
            }

            const transformer = new TransformerClass(this.logger);
            currentData = await transformer.transform(
                currentData,
                transformerConfig.config || {}
            );

            if (this.shouldCancel) {
                throw new Error('Transformation cancelled');
            }
        }

        this.logger.info('Transformation completed');
        return currentData;
    }

    /**
     * Load phase
     */
    async load(data, loaderConfig) {
        this.logger.info('Starting load', { strategy: loaderConfig.type });

        const loaderType = loaderConfig.type || 'merge-strategy';
        const LoaderClass = this.loaders.get(loaderType);

        if (!LoaderClass) {
            throw new Error(`Unknown loader type: ${loaderType}`);
        }

        const loader = new LoaderClass(this.dataManager, this.logger);
        const result = await loader.load(data, loaderConfig.config || {});

        this.logger.info('Load completed');
        return result;
    }

    /**
     * Validate ETL configuration
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Configuration is required');
        }

        if (!config.source) {
            throw new Error('Source configuration is required');
        }

        if (!config.source.type) {
            throw new Error('Source type is required');
        }

        return true;
    }

    /**
     * Register custom extractor
     */
    registerExtractor(type, extractorClass) {
        this.extractors.set(type, extractorClass);
        this.logger.debug(`Registered extractor: ${type}`);
    }

    /**
     * Register custom transformer
     */
    registerTransformer(type, transformerClass) {
        this.transformers.set(type, transformerClass);
        this.logger.debug(`Registered transformer: ${type}`);
    }

    /**
     * Register custom loader
     */
    registerLoader(type, loaderClass) {
        this.loaders.set(type, loaderClass);
        this.logger.debug(`Registered loader: ${type}`);
    }

    /**
     * Pause execution
     */
    pause() {
        this.isPaused = true;
        this.logger.info('ETL pipeline paused');
    }

    /**
     * Resume execution
     */
    resume() {
        this.isPaused = false;
        this.logger.info('ETL pipeline resumed');
    }

    /**
     * Cancel execution
     */
    cancel() {
        this.shouldCancel = true;
        this.logger.info('ETL pipeline cancellation requested');
    }

    /**
     * Event handling
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.logger.error('Event callback error', { event, error: error.message });
                }
            });
        }
    }

    /**
     * Get available extractors
     */
    getAvailableExtractors() {
        return Array.from(this.extractors.keys());
    }

    /**
     * Get available transformers
     */
    getAvailableTransformers() {
        return Array.from(this.transformers.keys());
    }

    /**
     * Get available loaders
     */
    getAvailableLoaders() {
        return Array.from(this.loaders.keys());
    }

    /**
     * Export logs
     */
    exportLogs() {
        this.logger.export();
    }

    /**
     * Export error log
     */
    exportErrors() {
        this.errorHandler.exportLog();
    }
}
