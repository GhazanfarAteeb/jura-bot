/**
 * A simple rate-limited job queue for Discord API operations
 * Helps prevent hitting Discord's rate limits during bulk operations
 */

class RateLimitQueue {
    constructor(options = {}) {
        this.concurrency = options.concurrency || 1; // How many jobs can run at once
        this.interval = options.interval || 150; // Minimum ms between jobs
        this.timeout = options.timeout || 30000; // Max time per job
        
        this.queue = [];
        this.running = 0;
        this.lastRun = 0;
        this.paused = false;
        this.results = [];
        this.errors = [];
    }

    /**
     * Add a job to the queue
     * @param {Function} fn - Async function to execute
     * @param {string} label - Optional label for logging/tracking
     * @returns {Promise} - Resolves when job completes
     */
    add(fn, label = 'job') {
        return new Promise((resolve, reject) => {
            this.queue.push({
                fn,
                label,
                resolve,
                reject,
                addedAt: Date.now()
            });
            this.process();
        });
    }

    /**
     * Add multiple jobs at once
     * @param {Array<{fn: Function, label: string}>} jobs 
     * @returns {Promise<Array>} - Resolves with all results
     */
    async addAll(jobs) {
        const promises = jobs.map(job => this.add(job.fn, job.label));
        return Promise.allSettled(promises);
    }

    /**
     * Process the queue
     */
    async process() {
        if (this.paused) return;
        if (this.running >= this.concurrency) return;
        if (this.queue.length === 0) return;

        // Check interval timing
        const now = Date.now();
        const timeSinceLast = now - this.lastRun;
        
        if (timeSinceLast < this.interval) {
            setTimeout(() => this.process(), this.interval - timeSinceLast);
            return;
        }

        const job = this.queue.shift();
        if (!job) return;

        this.running++;
        this.lastRun = Date.now();

        try {
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Job "${job.label}" timed out after ${this.timeout}ms`)), this.timeout);
            });

            // Race between job and timeout
            const result = await Promise.race([
                job.fn(),
                timeoutPromise
            ]);

            this.results.push({ label: job.label, success: true, result });
            job.resolve(result);
        } catch (error) {
            this.errors.push({ label: job.label, error: error.message });
            job.reject(error);
        } finally {
            this.running--;
            // Process next job
            if (this.queue.length > 0) {
                setTimeout(() => this.process(), this.interval);
            }
        }
    }

    /**
     * Pause queue processing
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resume queue processing
     */
    resume() {
        this.paused = false;
        this.process();
    }

    /**
     * Clear all pending jobs
     */
    clear() {
        const pending = this.queue.length;
        this.queue.forEach(job => {
            job.reject(new Error('Queue cleared'));
        });
        this.queue = [];
        return pending;
    }

    /**
     * Get queue statistics
     */
    get stats() {
        return {
            pending: this.queue.length,
            running: this.running,
            completed: this.results.length,
            failed: this.errors.length,
            successRate: this.results.length > 0 
                ? (this.results.filter(r => r.success).length / this.results.length * 100).toFixed(1) + '%'
                : '0%'
        };
    }

    /**
     * Wait for all current jobs to complete
     */
    async onIdle() {
        return new Promise(resolve => {
            const check = () => {
                if (this.queue.length === 0 && this.running === 0) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    /**
     * Create a queue optimized for Discord API operations
     */
    static forDiscord() {
        return new RateLimitQueue({
            concurrency: 1,
            interval: 200, // 200ms between requests (5 per second max)
            timeout: 30000
        });
    }

    /**
     * Create a faster queue for less sensitive operations
     */
    static fast() {
        return new RateLimitQueue({
            concurrency: 2,
            interval: 100,
            timeout: 15000
        });
    }
}

export default RateLimitQueue;
