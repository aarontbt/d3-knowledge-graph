/**
 * Logging utility for ETL operations
 */

export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

export class Logger {
    constructor(options = {}) {
        this.level = options.level || LogLevel.INFO;
        this.prefix = options.prefix || '[ETL]';
        this.logs = [];
        this.maxLogs = options.maxLogs || 1000;
        this.enableConsole = options.enableConsole !== false;
    }

    log(level, message, data = {}) {
        if (level < this.level) {
            return;
        }

        const logEntry = {
            level: this.getLevelName(level),
            message,
            data,
            timestamp: new Date().toISOString()
        };

        this.logs.push(logEntry);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output
        if (this.enableConsole) {
            const prefix = `${this.prefix} [${logEntry.level}]`;
            const fullMessage = `${prefix} ${message}`;

            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(fullMessage, data);
                    break;
                case LogLevel.INFO:
                    console.info(fullMessage, data);
                    break;
                case LogLevel.WARN:
                    console.warn(fullMessage, data);
                    break;
                case LogLevel.ERROR:
                    console.error(fullMessage, data);
                    break;
            }
        }
    }

    debug(message, data) {
        this.log(LogLevel.DEBUG, message, data);
    }

    info(message, data) {
        this.log(LogLevel.INFO, message, data);
    }

    warn(message, data) {
        this.log(LogLevel.WARN, message, data);
    }

    error(message, data) {
        this.log(LogLevel.ERROR, message, data);
    }

    getLevelName(level) {
        const names = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        return names[level] || 'UNKNOWN';
    }

    getLogs(level = null) {
        if (level === null) {
            return [...this.logs];
        }
        const levelName = this.getLevelName(level);
        return this.logs.filter(log => log.level === levelName);
    }

    clear() {
        this.logs = [];
    }

    export() {
        const logData = {
            timestamp: new Date().toISOString(),
            totalLogs: this.logs.length,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `etl-log-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    toString() {
        return this.logs.map(log =>
            `[${log.timestamp}] [${log.level}] ${log.message} ${JSON.stringify(log.data)}`
        ).join('\n');
    }
}
