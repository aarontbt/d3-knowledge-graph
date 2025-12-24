/**
 * Error handling utilities for ETL operations
 */

export class ETLError extends Error {
    constructor(message, type = 'ETLError', details = {}) {
        super(message);
        this.name = type;
        this.type = type;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

export class ExtractionError extends ETLError {
    constructor(message, details = {}) {
        super(message, 'ExtractionError', details);
    }
}

export class ValidationError extends ETLError {
    constructor(message, details = {}) {
        super(message, 'ValidationError', details);
    }
}

export class TransformationError extends ETLError {
    constructor(message, details = {}) {
        super(message, 'TransformationError', details);
    }
}

export class LoadError extends ETLError {
    constructor(message, details = {}) {
        super(message, 'LoadError', details);
    }
}

export class ConfigurationError extends ETLError {
    constructor(message, details = {}) {
        super(message, 'ConfigurationError', details);
    }
}

export class ErrorHandler {
    constructor(options = {}) {
        this.continueOnError = options.continueOnError || false;
        this.errors = [];
        this.warnings = [];
    }

    handleError(error, context = {}) {
        const wrappedError = error instanceof ETLError
            ? error
            : new ETLError(error.message, 'UnknownError', { originalError: error, ...context });

        this.errors.push(wrappedError);

        if (!this.continueOnError) {
            throw wrappedError;
        }

        return wrappedError;
    }

    addWarning(message, details = {}) {
        this.warnings.push({
            message,
            details,
            timestamp: new Date().toISOString()
        });
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    hasWarnings() {
        return this.warnings.length > 0;
    }

    getErrors() {
        return this.errors;
    }

    getWarnings() {
        return this.warnings;
    }

    getSummary() {
        return {
            errorCount: this.errors.length,
            warningCount: this.warnings.length,
            errors: this.errors.map(e => e.toJSON()),
            warnings: this.warnings
        };
    }

    clear() {
        this.errors = [];
        this.warnings = [];
    }

    exportLog() {
        const log = {
            timestamp: new Date().toISOString(),
            summary: this.getSummary(),
            details: {
                errors: this.errors.map(e => e.toJSON()),
                warnings: this.warnings
            }
        };

        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `etl-error-log-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}
