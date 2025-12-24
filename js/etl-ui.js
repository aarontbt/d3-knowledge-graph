/**
 * ETL UI Integration
 * Handles the ETL import modal and user interactions
 */

import { ETLManager } from './etl/etl-manager.js';

export class ETLUI {
    constructor(dataManager, app) {
        this.dataManager = dataManager;
        this.app = app;
        this.etlManager = new ETLManager(dataManager);

        this.currentSource = null;
        this.sourceData = null;

        this.initializeUI();
    }

    initializeUI() {
        // Get modal elements
        this.modal = document.getElementById('etl-modal');
        this.sourceButtons = document.querySelectorAll('.source-btn');
        this.configPanel = document.getElementById('etl-config-panel');
        this.executeBtn = document.getElementById('etl-execute-btn');
        this.cancelBtn = document.getElementById('etl-cancel-btn');

        // Get step containers
        this.sourceConfig = document.getElementById('etl-source-config');
        this.transformConfig = document.getElementById('etl-transform-config');
        this.loadConfig = document.getElementById('etl-load-config');
        this.progressContainer = document.getElementById('etl-progress-container');
        this.resultsContainer = document.getElementById('etl-results-container');

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Source selection
        this.sourceButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectSource(btn.dataset.source);
            });
        });

        // Execute button
        this.executeBtn.addEventListener('click', () => {
            this.executeETL();
        });

        // Cancel button
        this.cancelBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal
        const closeBtn = this.modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // ETL events
        this.etlManager.on('stage', (stage) => {
            this.updateStage(stage);
        });

        this.etlManager.on('progress', (progress) => {
            this.updateProgress(progress);
        });

        this.etlManager.on('complete', (result) => {
            this.showResults(result);
        });

        this.etlManager.on('error', (error) => {
            this.showError(error);
        });
    }

    showModal() {
        this.modal.style.display = 'block';
        this.resetModal();
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    resetModal() {
        this.currentSource = null;
        this.sourceData = null;

        // Reset active states
        this.sourceButtons.forEach(btn => btn.classList.remove('active'));

        // Hide all steps
        this.sourceConfig.style.display = 'none';
        this.transformConfig.style.display = 'none';
        this.loadConfig.style.display = 'none';
        this.progressContainer.style.display = 'none';
        this.resultsContainer.style.display = 'none';

        // Disable execute button
        this.executeBtn.disabled = true;
        this.executeBtn.textContent = 'Import';

        // Clear config panel
        this.configPanel.innerHTML = '';
    }

    selectSource(source) {
        this.currentSource = source;

        // Update active state
        this.sourceButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.source === source);
        });

        // Show configuration for selected source
        this.showSourceConfig(source);

        // Show other steps
        this.transformConfig.style.display = 'block';
        this.loadConfig.style.display = 'block';
    }

    showSourceConfig(source) {
        this.sourceConfig.style.display = 'block';
        this.configPanel.innerHTML = '';

        switch (source) {
            case 'json':
                this.configPanel.innerHTML = this.getJSONConfig();
                break;
            case 'csv':
                this.configPanel.innerHTML = this.getCSVConfig();
                break;
            case 'api':
                this.configPanel.innerHTML = this.getAPIConfig();
                break;
            case 'markdown':
                this.configPanel.innerHTML = this.getMarkdownConfig();
                break;
        }

        // Setup file inputs
        const fileInput = this.configPanel.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.sourceData = e.target.files;
                this.executeBtn.disabled = false;
            });
        }

        // Setup text inputs for API
        const urlInput = this.configPanel.querySelector('#etl-api-url');
        if (urlInput) {
            urlInput.addEventListener('input', (e) => {
                this.executeBtn.disabled = !e.target.value;
            });
        }
    }

    getJSONConfig() {
        return `
            <div class="form-group">
                <label>Select JSON file:</label>
                <input type="file" accept=".json" class="etl-file-input" />
            </div>
        `;
    }

    getCSVConfig() {
        return `
            <div class="form-group">
                <label>Select CSV file:</label>
                <input type="file" accept=".csv" class="etl-file-input" />
            </div>
            <div class="form-group">
                <label>CSV has header row</label>
                <input type="checkbox" id="csv-header" checked />
            </div>
            <div class="form-group">
                <label>Data type:</label>
                <select id="csv-type">
                    <option value="nodes">Nodes (will generate IDs)</option>
                    <option value="edges">Edges (requires source, target columns)</option>
                    <option value="both">Both (separate nodes and edges sheets)</option>
                </select>
            </div>
        `;
    }

    getAPIConfig() {
        return `
            <div class="form-group">
                <label>API URL *</label>
                <input type="text" id="etl-api-url" placeholder="https://api.example.com/data" class="form-control" />
            </div>
            <div class="form-group">
                <label>Authentication (optional)</label>
                <select id="etl-api-auth-type">
                    <option value="">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apikey">API Key</option>
                </select>
            </div>
            <div class="form-group" id="etl-api-token-group" style="display:none;">
                <label>Token/Key</label>
                <input type="password" id="etl-api-token" class="form-control" />
            </div>
            <div class="form-group">
                <label>Response path (JSON path to data array)</label>
                <input type="text" id="etl-api-path" placeholder="e.g., data.items" class="form-control" />
            </div>
        `;
    }

    getMarkdownConfig() {
        return `
            <div class="form-group">
                <label>Select Markdown files (.md):</label>
                <input type="file" accept=".md" multiple class="etl-file-input" />
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="md-metadata" checked /> Extract frontmatter metadata</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="md-links" checked /> Generate edges from [[wiki-links]]</label>
            </div>
        `;
    }

    async executeETL() {
        if (!this.currentSource || (!this.sourceData && this.currentSource !== 'api')) {
            alert('Please select a data source');
            return;
        }

        // Hide results from previous run
        this.resultsContainer.style.display = 'none';

        // Show progress
        this.progressContainer.style.display = 'block';
        this.executeBtn.disabled = true;
        this.executeBtn.textContent = 'Processing...';

        // Build configuration
        const config = this.buildConfig();

        try {
            // Execute ETL pipeline
            const result = await this.etlManager.execute(config);

            if (result.success) {
                // Reload graph data in app
                if (!config.options.dryRun) {
                    this.app.loadData();
                }
            }

        } catch (error) {
            console.error('ETL execution failed:', error);
        } finally {
            this.progressContainer.style.display = 'none';
            this.executeBtn.disabled = false;
            this.executeBtn.textContent = 'Import';
        }
    }

    buildConfig() {
        const transformers = [];

        // Add selected transformers
        if (document.getElementById('etl-validate').checked) {
            transformers.push({ type: 'validator' });
        }

        if (document.getElementById('etl-normalize').checked) {
            transformers.push({ type: 'normalizer' });
        }

        if (document.getElementById('etl-enrich').checked) {
            transformers.push({ type: 'enricher', config: {
                extractKeywords: true,
                addStats: true,
                extractHashtags: true
            }});
        }

        if (document.getElementById('etl-dedupe').checked) {
            transformers.push({ type: 'deduplicator', config: {
                by: 'label',
                strategy: 'merge'
            }});
        }

        // Build source config
        let sourceConfig = {
            type: this.currentSource,
            config: this.getSourceConfig()
        };

        // Build loader config
        const strategy = document.getElementById('etl-strategy').value;
        const loaderConfig = {
            type: 'merge-strategy',
            config: { strategy }
        };

        // Options
        const options = {
            dryRun: document.getElementById('etl-dry-run').checked
        };

        return {
            source: sourceConfig,
            transformers,
            loader: loaderConfig,
            options
        };
    }

    getSourceConfig() {
        switch (this.currentSource) {
            case 'json':
                return {
                    source: 'file',
                    data: this.sourceData[0]
                };

            case 'csv':
                return {
                    file: this.sourceData[0],
                    header: document.getElementById('csv-header')?.checked !== false,
                    dynamicTyping: true
                };

            case 'api':
                const url = document.getElementById('etl-api-url').value;
                const authType = document.getElementById('etl-api-auth-type').value;
                const token = document.getElementById('etl-api-token')?.value;
                const path = document.getElementById('etl-api-path')?.value;

                const config = { url };

                if (authType && token) {
                    config.auth = { type: authType, token };
                }

                if (path) {
                    // Simple path resolver
                    config.transform = (response) => {
                        const keys = path.split('.');
                        let data = response;
                        for (const key of keys) {
                            data = data[key];
                        }
                        return data;
                    };
                }

                return config;

            case 'markdown':
                return {
                    files: this.sourceData,
                    extractMetadata: document.getElementById('md-metadata')?.checked !== false,
                    generateEdges: document.getElementById('md-links')?.checked !== false
                };

            default:
                return {};
        }
    }

    updateStage(stage) {
        const stageText = document.getElementById('etl-stage-text');
        const stages = {
            'extract': 'Extracting data from source...',
            'transform': 'Transforming data...',
            'load': 'Loading data into graph...'
        };
        stageText.textContent = stages[stage] || stage;
    }

    updateProgress(progress) {
        const progressBar = document.getElementById('etl-progress-bar');
        const progressText = document.getElementById('etl-progress-text');

        progressBar.style.width = progress.progress + '%';
        progressText.textContent = `${Math.round(progress.progress)}% - ${progress.processed}/${progress.total} items`;
    }

    showResults(result) {
        this.resultsContainer.style.display = 'block';
        const resultsDiv = document.getElementById('etl-results');

        if (result.result.dryRun) {
            resultsDiv.innerHTML = `
                <h4>Dry Run Results (Preview Only)</h4>
                <div class="result-item">
                    <span class="result-label">Total Nodes:</span>
                    <span class="result-value">${result.result.preview.totalNodes}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Total Edges:</span>
                    <span class="result-value">${result.result.preview.totalEdges}</span>
                </div>
                <p style="margin-top: 1rem; color: var(--warning-color);">
                    This was a dry run. No data was imported. Uncheck "Dry run" to import.
                </p>
            `;
        } else {
            const res = result.result;
            resultsDiv.innerHTML = `
                <h4>Import Successful!</h4>
                <div class="result-item">
                    <span class="result-label">Nodes Added:</span>
                    <span class="result-value">${res.nodesAdded || 0}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Nodes Updated:</span>
                    <span class="result-value">${res.nodesUpdated || 0}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Edges Added:</span>
                    <span class="result-value">${res.edgesAdded || 0}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Total Nodes:</span>
                    <span class="result-value">${res.nodesTotal || 0}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Total Edges:</span>
                    <span class="result-value">${res.edgesTotal || 0}</span>
                </div>
                ${result.errors && result.errors.warningCount > 0 ? `
                <div class="result-item">
                    <span class="result-label">Warnings:</span>
                    <span class="result-value" style="color: var(--warning-color);">${result.errors.warningCount}</span>
                </div>
                ` : ''}
            `;
        }
    }

    showError(error) {
        this.resultsContainer.style.display = 'block';
        const resultsDiv = document.getElementById('etl-results');

        resultsDiv.innerHTML = `
            <h4 style="color: var(--danger-color);">Import Failed</h4>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">
                ${error.message || 'An unknown error occurred'}
            </p>
        `;
    }
}
