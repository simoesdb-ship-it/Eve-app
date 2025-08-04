import { cache } from './middleware/caching';
import { optimizedPatternAnalyzer } from './optimized-pattern-analyzer';
import { dbOptimizations } from './database-optimizations';

export class PerformanceMonitor {
  private metrics = {
    requestCount: 0,
    totalResponseTime: 0,
    errorCount: 0,
    patternAnalysisTime: 0,
    cacheHitRate: 0,
    startTime: Date.now()
  };

  trackRequest(responseTimeMs: number) {
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += responseTimeMs;
  }

  trackError() {
    this.metrics.errorCount++;
  }

  trackPatternAnalysis(timeMs: number) {
    this.metrics.patternAnalysisTime += timeMs;
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgResponseTime = this.metrics.requestCount > 0 ? 
      this.metrics.totalResponseTime / this.metrics.requestCount : 0;
    
    const cacheStats = cache.getStats();
    const analyzerStats = optimizedPatternAnalyzer.getAnalysisStats();

    return {
      uptime: uptime,
      uptimeFormatted: this.formatDuration(uptime),
      requests: {
        total: this.metrics.requestCount,
        errors: this.metrics.errorCount,
        errorRate: this.metrics.requestCount > 0 ? 
          (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0,
        avgResponseTime: Math.round(avgResponseTime),
      },
      cache: {
        ...cacheStats,
        hitRatePercentage: Math.round(cacheStats.hitRate * 100)
      },
      patternAnalysis: {
        ...analyzerStats,
        totalAnalysisTime: this.metrics.patternAnalysisTime,
        avgAnalysisTime: this.metrics.requestCount > 0 ? 
          this.metrics.patternAnalysisTime / this.metrics.requestCount : 0
      },
      memory: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  private getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      rss: Math.round(used.rss / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      unit: 'MB'
    };
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      errorCount: 0,
      patternAnalysisTime: 0,
      cacheHitRate: 0,
      startTime: Date.now()
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();