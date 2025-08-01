// Backend/src/config/logger.js
const winston = require("winston");
const path = require("path");

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, "../../logs");
const fs = require("fs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, {recursive: true});
}

// Define log levels
const levels = {
  error: 0, // 🚨 Critical errors
  warn: 1, // ⚠️ Warnings
  info: 2, // ℹ️ General information
  debug: 3, // 🔍 Debug information
};

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({stack: true}),
    winston.format.json()
  ),
  defaultMeta: {
    service: "shop-management-api",
    version: "2.0.0",
  },
  transports: [
    // 🚨 Error logs (only errors)
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({stack: true}),
        winston.format.json()
      ),
    }),

    // 📋 Combined logs (all levels)
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // 🔍 Debug logs (development only)
    ...(process.env.NODE_ENV === "development"
      ? [
          new winston.transports.File({
            filename: path.join(logDir, "debug.log"),
            level: "debug",
            maxsize: 5242880, // 5MB
            maxFiles: 3,
          }),
        ]
      : []),

    // 🖥️ Console output (development only)
    ...(process.env.NODE_ENV === "development"
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({format: "HH:mm:ss"}),
              winston.format.printf(({timestamp, level, message, ...meta}) => {
                return `${timestamp} [${level}]: ${message} ${
                  Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
                }`;
              })
            ),
          }),
        ]
      : []),
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, "rejections.log"),
    }),
  ],
});

// Add request ID to logs for tracing
logger.addRequestId = (req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  req.logger = logger.child({requestId: req.requestId});
  next();
};

module.exports = logger;
