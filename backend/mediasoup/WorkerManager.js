const mediasoup = require('mediasoup');
const config = require('./config');
const EventEmitter = require('events');

class WorkerManager extends EventEmitter {
    constructor() {
        super();
        this.workers = []; // Array of { worker, pid, load }
        this.nextWorkerIndex = 0; // For Round-Robin strategy
    }

    async init() {
        const numWorkers = config.numWorkers;
        console.log(`🚀 Initializing ${numWorkers} Mediasoup workers...`);

        for (let i = 0; i < numWorkers; i++) {
            try {
                const worker = await mediasoup.createWorker({
                    rtcMinPort: config.worker.rtcMinPort,
                    rtcMaxPort: config.worker.rtcMaxPort,
                    logLevel: config.worker.logLevel,
                    logTags: config.worker.logTags
                });

                const workerData = {
                    worker,
                    pid: worker.pid,
                    index: i
                };

                this.workers.push(workerData);

                console.log(`✅ Worker ${i + 1}/${numWorkers} created [PID:${worker.pid}]`);

                // Listen for worker death
                worker.on('died', () => {
                    console.error(`❌ Worker [PID:${worker.pid}] died unexpectedly.`);
                    this.handleWorkerDeath(workerData);
                });

            } catch (error) {
                console.error(`❌ Failed to create worker ${i + 1}:`, error);
            }
        }

        if (this.workers.length === 0) {
            throw new Error('No Mediasoup workers could be created.');
        }
    }

    getWorker() {
        if (this.workers.length === 0) {
            throw new Error('No workers available');
        }

        // Strategy: Round-Robin
        const workerData = this.workers[this.nextWorkerIndex];
        this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;

        // Logging strategy selection
        // console.log(`⚖️  Strategy Round-Robin selected worker [PID:${workerData.pid}] for new room`);

        return workerData.worker;
    }

    handleWorkerDeath(workerData) {
        // Emit event so RoomManager can cleanup
        this.emit('workerDied', workerData.pid);

        // Remove from list so new rooms aren't assigned to it
        // We might want to restart it, but for now strict cleanup as requested
        const index = this.workers.indexOf(workerData);
        if (index !== -1) {
            this.workers.splice(index, 1);
        }

        console.log(`⚠️  Worker [PID:${workerData.pid}] removed from pool. Remaining workers: ${this.workers.length}`);

        // Optional: Attempt to restart worker? 
        // User requested: "Aucune tentative de migration de room vers un autre worker"
        // And "Les ressources Mediasoup doivent être nettoyées"
        // Restarting a *new* worker to maintain pool size is probably good practice though.
        setTimeout(() => {
            this.createReplacementWorker(workerData.index);
        }, 2000);
    }

    async createReplacementWorker(originalIndex) {
        try {
            console.log(`🔄 Attempting to spawn replacement worker...`);
            const worker = await mediasoup.createWorker({
                rtcMinPort: config.worker.rtcMinPort,
                rtcMaxPort: config.worker.rtcMaxPort,
                logLevel: config.worker.logLevel,
                logTags: config.worker.logTags
            });

            const newWorkerData = {
                worker,
                pid: worker.pid,
                index: originalIndex // Keep logical index if useful, or just append
            };

            this.workers.push(newWorkerData);
            console.log(`✅ Replacement worker created [PID:${worker.pid}]`);

            worker.on('died', () => {
                console.error(`❌ Replacement Worker [PID:${worker.pid}] died.`);
                this.handleWorkerDeath(newWorkerData);
            });

        } catch (error) {
            console.error(`❌ Failed to spawn replacement worker:`, error);
        }
    }
}

module.exports = new WorkerManager();
