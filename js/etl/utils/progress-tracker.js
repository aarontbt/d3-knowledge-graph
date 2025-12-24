/**
 * Progress tracking for ETL operations
 */

export class ProgressTracker {
    constructor(options = {}) {
        this.total = 0;
        this.processed = 0;
        this.successful = 0;
        this.failed = 0;
        this.warnings = 0;
        this.startTime = null;
        this.endTime = null;
        this.stage = 'initialized';
        this.callbacks = {
            onProgress: options.onProgress || null,
            onStageChange: options.onStageChange || null,
            onComplete: options.onComplete || null
        };
    }

    start(total, stage = 'processing') {
        this.total = total;
        this.processed = 0;
        this.successful = 0;
        this.failed = 0;
        this.warnings = 0;
        this.startTime = Date.now();
        this.endTime = null;
        this.setStage(stage);
    }

    setStage(stage) {
        this.stage = stage;
        if (this.callbacks.onStageChange) {
            this.callbacks.onStageChange(stage);
        }
    }

    increment(success = true, warning = false) {
        this.processed++;
        if (success) {
            this.successful++;
        } else {
            this.failed++;
        }
        if (warning) {
            this.warnings++;
        }
        this.emitProgress();
    }

    addWarning() {
        this.warnings++;
        this.emitProgress();
    }

    complete() {
        this.endTime = Date.now();
        this.setStage('completed');
        if (this.callbacks.onComplete) {
            this.callbacks.onComplete(this.getStats());
        }
    }

    getProgress() {
        return this.total > 0 ? (this.processed / this.total) * 100 : 0;
    }

    getElapsedTime() {
        if (!this.startTime) return 0;
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }

    getEstimatedTimeRemaining() {
        if (!this.startTime || this.processed === 0) return 0;

        const elapsed = this.getElapsedTime();
        const rate = this.processed / elapsed;
        const remaining = this.total - this.processed;
        return remaining / rate;
    }

    getRate() {
        const elapsed = this.getElapsedTime();
        return elapsed > 0 ? (this.processed / (elapsed / 1000)) : 0;
    }

    getStats() {
        return {
            total: this.total,
            processed: this.processed,
            successful: this.successful,
            failed: this.failed,
            warnings: this.warnings,
            progress: this.getProgress(),
            stage: this.stage,
            elapsed: this.getElapsedTime(),
            estimatedRemaining: this.getEstimatedTimeRemaining(),
            rate: this.getRate()
        };
    }

    emitProgress() {
        if (this.callbacks.onProgress) {
            this.callbacks.onProgress(this.getStats());
        }
    }

    reset() {
        this.total = 0;
        this.processed = 0;
        this.successful = 0;
        this.failed = 0;
        this.warnings = 0;
        this.startTime = null;
        this.endTime = null;
        this.stage = 'initialized';
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    toString() {
        const stats = this.getStats();
        return `Progress: ${stats.processed}/${stats.total} (${stats.progress.toFixed(1)}%) - ` +
               `Success: ${stats.successful}, Failed: ${stats.failed}, Warnings: ${stats.warnings} - ` +
               `Elapsed: ${this.formatTime(stats.elapsed)} - ` +
               `Rate: ${stats.rate.toFixed(1)} items/sec`;
    }
}
