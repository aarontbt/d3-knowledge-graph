/**
 * CSV Extractor
 * Extracts data from CSV files using PapaParse
 */

import { BaseExtractor } from './base-extractor.js';
import { ExtractionError } from '../utils/error-handler.js';

export class CSVExtractor extends BaseExtractor {
    constructor(logger = null) {
        super(logger);
        this.type = 'csv';
    }

    async extract(config) {
        this.validateConfig(config);
        this.log('info', 'Starting CSV extraction');

        // Check if PapaParse is available
        if (typeof Papa === 'undefined') {
            throw new ExtractionError('PapaParse library is not loaded. Please include it via CDN.');
        }

        try {
            const data = await this.parseCSV(config.file, config);
            this.log('info', 'CSV extraction completed', { rows: data.length });

            return data;

        } catch (error) {
            throw new ExtractionError('CSV extraction failed', { originalError: error.message });
        }
    }

    async parseCSV(file, config) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: config.header !== false,
                delimiter: config.delimiter || '',
                dynamicTyping: config.dynamicTyping !== false,
                skipEmptyLines: config.skipEmptyLines !== false,
                transformHeader: config.transformHeader || undefined,
                complete: (results) => {
                    if (results.errors && results.errors.length > 0) {
                        this.log('warn', 'CSV parsing warnings', { errors: results.errors });
                    }

                    // Apply column mapping if provided
                    let data = results.data;
                    if (config.mapping && results.meta.fields) {
                        data = this.applyMapping(data, config.mapping, results.meta.fields);
                    }

                    resolve(data);
                },
                error: (error) => {
                    reject(new ExtractionError('Failed to parse CSV', { error: error.message }));
                }
            });
        });
    }

    applyMapping(data, mapping, fields) {
        return data.map(row => {
            const mappedRow = {};

            for (const [csvField, graphField] of Object.entries(mapping)) {
                if (row.hasOwnProperty(csvField)) {
                    this.setNestedProperty(mappedRow, graphField, row[csvField]);
                }
            }

            // Include unmapped fields
            for (const field of fields) {
                if (!mapping.hasOwnProperty(field)) {
                    mappedRow[field] = row[field];
                }
            }

            return mappedRow;
        });
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

    validateConfig(config) {
        super.validateConfig(config);

        if (!config.file) {
            throw new ExtractionError('File is required');
        }

        return true;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Extract data from CSV files',
            configSchema: {
                file: {
                    type: 'File',
                    required: true
                },
                delimiter: {
                    type: 'string',
                    default: 'auto-detect'
                },
                header: {
                    type: 'boolean',
                    default: true
                },
                dynamicTyping: {
                    type: 'boolean',
                    default: true
                },
                skipEmptyLines: {
                    type: 'boolean',
                    default: true
                },
                mapping: {
                    type: 'object',
                    description: 'Map CSV columns to graph fields'
                }
            }
        };
    }
}
