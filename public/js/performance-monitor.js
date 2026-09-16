/**
 * Performance Monitor - Theo dõi hiệu suất trang
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.marks = new Map();
    }

    /**
     * Đánh dấu thời điểm bắt đầu
     */
    mark(name) {
        this.marks.set(name, performance.now());
        performance.mark(name);
    }

    /**
     * Đo thời gian từ mark đến hiện tại
     */
    measure(name, startMark) {
        const startTime = this.marks.get(startMark);
        if (!startTime) {
            console.warn(`Start mark "${startMark}" not found`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.metrics[name] = duration;

        try {
            performance.measure(name, startMark);
        } catch (e) {
            // Ignore if mark doesn't exist
        }

        return duration;
    }

    /**
     * Lấy Navigation Timing metrics
     */
    getNavigationMetrics() {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) return null;

        return {
            // DNS lookup
            dnsLookup: perfData.domainLookupEnd - perfData.domainLookupStart,

            // TCP connection
            tcpConnection: perfData.connectEnd - perfData.connectStart,

            // Request + Response
            requestTime: perfData.responseStart - perfData.requestStart,
            responseTime: perfData.responseEnd - perfData.responseStart,

            // DOM Processing
            domProcessing: perfData.domComplete - perfData.domInteractive,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,

            // Load Event
            loadEvent: perfData.loadEventEnd - perfData.loadEventStart,

            // Total
            totalTime: perfData.loadEventEnd - perfData.fetchStart,

            // Time to First Byte
            ttfb: perfData.responseStart - perfData.requestStart
        };
    }

    /**
     * Lấy Paint Timing metrics
     */
    getPaintMetrics() {
        const paintEntries = performance.getEntriesByType('paint');
        const metrics = {};

        paintEntries.forEach(entry => {
            metrics[entry.name] = entry.startTime;
        });

        return metrics;
    }

    /**
     * Lấy Resource Timing metrics
     */
    getResourceMetrics() {
        const resources = performance.getEntriesByType('resource');

        const byType = {};
        let totalSize = 0;
        let totalDuration = 0;

        resources.forEach(resource => {
            const type = resource.initiatorType;

            if (!byType[type]) {
                byType[type] = {
                    count: 0,
                    duration: 0,
                    size: 0
                };
            }

            byType[type].count++;
            byType[type].duration += resource.duration;

            if (resource.transferSize) {
                byType[type].size += resource.transferSize;
                totalSize += resource.transferSize;
            }

            totalDuration += resource.duration;
        });

        return {
            byType,
            total: {
                count: resources.length,
                duration: totalDuration,
                size: totalSize
            }
        };
    }

    /**
     * Log tất cả metrics
     */
    logMetrics() {
        console.group('📊 Performance Metrics');

        // Navigation Timing
        const navMetrics = this.getNavigationMetrics();
        if (navMetrics) {
            console.group('⏱️ Navigation Timing');
            console.log('DNS Lookup:', navMetrics.dnsLookup.toFixed(2), 'ms');
            console.log('TCP Connection:', navMetrics.tcpConnection.toFixed(2), 'ms');
            console.log('Request Time:', navMetrics.requestTime.toFixed(2), 'ms');
            console.log('Response Time:', navMetrics.responseTime.toFixed(2), 'ms');
            console.log('DOM Processing:', navMetrics.domProcessing.toFixed(2), 'ms');
            console.log('DOM Content Loaded:', navMetrics.domContentLoaded.toFixed(2), 'ms');
            console.log('Load Event:', navMetrics.loadEvent.toFixed(2), 'ms');
            console.log('TTFB:', navMetrics.ttfb.toFixed(2), 'ms');
            console.log('🎯 Total Time:', navMetrics.totalTime.toFixed(2), 'ms');
            console.groupEnd();
        }

        // Paint Timing
        const paintMetrics = this.getPaintMetrics();
        if (Object.keys(paintMetrics).length > 0) {
            console.group('🎨 Paint Timing');
            Object.entries(paintMetrics).forEach(([name, time]) => {
                console.log(name + ':', time.toFixed(2), 'ms');
            });
            console.groupEnd();
        }

        // Resource Timing
        const resourceMetrics = this.getResourceMetrics();
        console.group('📦 Resource Timing');
        console.log('Total Resources:', resourceMetrics.total.count);
        console.log('Total Duration:', resourceMetrics.total.duration.toFixed(2), 'ms');
        console.log('Total Size:', (resourceMetrics.total.size / 1024).toFixed(2), 'KB');
        console.log('By Type:', resourceMetrics.byType);
        console.groupEnd();

        // Custom Metrics
        if (Object.keys(this.metrics).length > 0) {
            console.group('🔧 Custom Metrics');
            Object.entries(this.metrics).forEach(([name, duration]) => {
                console.log(name + ':', duration.toFixed(2), 'ms');
            });
            console.groupEnd();
        }

        console.groupEnd();
    }

    /**
     * Tạo performance report
     */
    generateReport() {
        return {
            navigation: this.getNavigationMetrics(),
            paint: this.getPaintMetrics(),
            resources: this.getResourceMetrics(),
            custom: this.metrics,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Đánh giá performance
     */
    getPerformanceScore() {
        const navMetrics = this.getNavigationMetrics();
        if (!navMetrics) return null;

        const totalTime = navMetrics.totalTime;

        let score = 100;
        let rating = 'Excellent';
        let color = '🟢';

        if (totalTime > 5000) {
            score = 20;
            rating = 'Poor';
            color = '🔴';
        } else if (totalTime > 3000) {
            score = 50;
            rating = 'Needs Improvement';
            color = '🟡';
        } else if (totalTime > 1500) {
            score = 75;
            rating = 'Good';
            color = '🟢';
        }

        return {
            score,
            rating,
            color,
            totalTime: totalTime.toFixed(2)
        };
    }

    /**
     * Log performance score
     */
    logScore() {
        const score = this.getPerformanceScore();
        if (!score) return;

        console.log(`\n${score.color} Performance Score: ${score.score}/100 - ${score.rating}`);
        console.log(`Total Load Time: ${score.totalTime}ms\n`);
    }
}

// Create global instance
window.performanceMonitor = new PerformanceMonitor();

// Auto-log metrics when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        window.performanceMonitor.logMetrics();
        window.performanceMonitor.logScore();
    }, 1000);
});

// Export
window.PerformanceMonitor = PerformanceMonitor;

console.log('✅ Performance Monitor initialized');
