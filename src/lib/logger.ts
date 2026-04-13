import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0 && meta.stack) {
      log += `\n${meta.stack}`;
    }
    return log;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

export function logProcessingTime(label: string, startTime: number): void {
  const duration = Date.now() - startTime;
  logger.info(`⏱️ ${label} completed in ${duration}ms`);
}

export function logError(context: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error({ message: `Error in ${context}: ${errorMessage}`, stack });
}

export default logger;