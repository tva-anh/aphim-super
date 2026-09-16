const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// 1. Data Masking Format (Ẩn thông tin nhạy cảm)
const maskSensitiveData = winston.format((info) => {
    // Các trường dữ liệu cần che giấu
    const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'otp', 'creditCard'];

    const maskObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        let maskedObj = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.includes(key.toLowerCase()) || sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                maskedObj[key] = '***MASKED***';
            } else if (typeof value === 'object' && value !== null) {
                maskedObj[key] = maskObject(value);
            } else {
                maskedObj[key] = value;
            }
        }
        return maskedObj;
    };

    // Áp dụng mask cho toàn bộ meta data truyền vào log
    if (info.meta) {
        info.meta = maskObject(info.meta);
    }
    
    return info;
});

// 2. Định dạng xuất Log (Console & File)
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    maskSensitiveData(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, meta }) => {
        let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        if (meta && Object.keys(meta).length > 0) {
            logMessage += ` | META: ${JSON.stringify(meta)}`;
        }
        if (stack) {
            logMessage += `\nSTACK: ${stack}`;
        }
        return logMessage;
    })
);

// 3. Cấu hình luân chuyển file log tự động (Rotate)
const transportDailyRotateFile = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../logs', 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,      // Nén file log cũ thành .gz
    maxSize: '20m',           // Tối đa 20MB mỗi file
    maxFiles: '14d',          // Lưu trữ tối đa 14 ngày, tự xoá file cũ hơn
    level: 'info'             // Ghi từ mức Info trở lên
});

const transportErrorFile = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',          // File lỗi lưu lâu hơn (30 ngày)
    level: 'error'            // Chỉ ghi lỗi
});

// 4. Khởi tạo Logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        transportDailyRotateFile,
        transportErrorFile
    ]
});

// Ghi log ra Console nếu đang Dev
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat
        )
    }));
}

module.exports = logger;
