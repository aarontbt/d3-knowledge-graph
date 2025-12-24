/**
 * API Extractor
 * Extracts data from REST APIs with pagination support
 */

import { BaseExtractor } from './base-extractor.js';
import { ExtractionError } from '../utils/error-handler.js';

export class APIExtractor extends BaseExtractor {
    constructor(logger = null) {
        super(logger);
        this.type = 'api';
    }

    async extract(config) {
        this.validateConfig(config);
        this.log('info', 'Starting API extraction', { url: config.url });

        try {
            let allData = [];

            if (config.pagination) {
                allData = await this.extractWithPagination(config);
            } else {
                const data = await this.fetchData(config);
                allData = config.transform ? config.transform(data) : data;
            }

            this.log('info', 'API extraction completed', { items: allData.length });

            return allData;

        } catch (error) {
            throw new ExtractionError('API extraction failed', {
                url: config.url,
                originalError: error.message
            });
        }
    }

    async fetchData(config) {
        const options = {
            method: config.method || 'GET',
            headers: this.buildHeaders(config)
        };

        if (config.body) {
            options.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(config.url, options);

            if (!response.ok) {
                throw new ExtractionError('API request failed', {
                    status: response.status,
                    statusText: response.statusText
                });
            }

            return await response.json();

        } catch (error) {
            throw new ExtractionError('Failed to fetch from API', {
                url: config.url,
                error: error.message
            });
        }
    }

    async extractWithPagination(config) {
        const { pagination } = config;
        let allData = [];
        let hasMore = true;
        let page = pagination.startPage || 1;
        let offset = pagination.startOffset || 0;

        this.log('info', 'Starting paginated extraction', { type: pagination.type });

        while (hasMore) {
            const url = this.buildPaginatedURL(config.url, pagination, page, offset);
            const pageConfig = { ...config, url };

            const response = await this.fetchData(pageConfig);
            const data = config.transform ? config.transform(response) : response;

            if (!Array.isArray(data)) {
                throw new ExtractionError('Paginated data must be an array');
            }

            allData = allData.concat(data);

            // Check if there's more data
            if (pagination.type === 'offset') {
                offset += pagination.pageSize;
                hasMore = data.length === pagination.pageSize;
            } else if (pagination.type === 'page') {
                page++;
                hasMore = data.length === pagination.pageSize;
            } else if (pagination.type === 'cursor') {
                const cursor = pagination.getCursor(response);
                hasMore = !!cursor;
                if (hasMore) {
                    pagination.cursor = cursor;
                }
            }

            // Safety limit
            if (pagination.maxPages && page > pagination.maxPages) {
                this.log('warn', 'Max pages reached', { maxPages: pagination.maxPages });
                break;
            }

            // Rate limiting
            if (pagination.rateLimit) {
                await this.delay(pagination.rateLimit);
            }
        }

        return allData;
    }

    buildPaginatedURL(baseUrl, pagination, page, offset) {
        const url = new URL(baseUrl);

        if (pagination.type === 'offset') {
            url.searchParams.set(pagination.offsetParam || 'offset', offset);
            url.searchParams.set(pagination.limitParam || 'limit', pagination.pageSize);
        } else if (pagination.type === 'page') {
            url.searchParams.set(pagination.pageParam || 'page', page);
            url.searchParams.set(pagination.sizeParam || 'size', pagination.pageSize);
        } else if (pagination.type === 'cursor' && pagination.cursor) {
            url.searchParams.set(pagination.cursorParam || 'cursor', pagination.cursor);
        }

        return url.toString();
    }

    buildHeaders(config) {
        const headers = {
            'Content-Type': 'application/json',
            ...config.headers
        };

        if (config.auth) {
            if (config.auth.type === 'bearer') {
                headers['Authorization'] = `Bearer ${config.auth.token}`;
            } else if (config.auth.type === 'apikey') {
                const headerName = config.auth.headerName || 'X-API-Key';
                headers[headerName] = config.auth.token;
            }
        }

        return headers;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    validateConfig(config) {
        super.validateConfig(config);

        if (!config.url) {
            throw new ExtractionError('URL is required');
        }

        if (config.pagination) {
            if (!config.pagination.type) {
                throw new ExtractionError('Pagination type is required');
            }

            if (!config.pagination.pageSize) {
                throw new ExtractionError('Pagination page size is required');
            }
        }

        return true;
    }

    getSchema() {
        return {
            type: this.type,
            description: 'Extract data from REST APIs with pagination support',
            configSchema: {
                url: {
                    type: 'string',
                    required: true
                },
                method: {
                    type: 'string',
                    default: 'GET'
                },
                headers: {
                    type: 'object'
                },
                auth: {
                    type: 'object',
                    properties: {
                        type: { enum: ['bearer', 'apikey'] },
                        token: { type: 'string' }
                    }
                },
                pagination: {
                    type: 'object',
                    properties: {
                        type: { enum: ['offset', 'page', 'cursor'] },
                        pageSize: { type: 'number' }
                    }
                },
                transform: {
                    type: 'function',
                    description: 'Transform API response to array'
                }
            }
        };
    }
}
