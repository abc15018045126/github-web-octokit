/**
 * Lightweight Cron Parser and Scheduler for Capacitor/Web
 * 
 * Supports standard 5-field Cron expressions:
 * * * * * *
 * | | | | |
 * | | | | +----- Day of Week (0 - 6) (Sunday=0)
 * | | | +------- Month (1 - 12)
 * | | +--------- Day of Month (1 - 31)
 * | +----------- Hour (0 - 23)
 * +------------- Minute (0 - 59)
 */

type Task = () => Promise<void> | void;

export class GitScheduler {
    private static intervals: Map<string, any> = new Map();

    /**
     * Parses a single cron field
     */
    private static checkField(value: number, pattern: string): boolean {
        if (pattern === '*') return true;

        // Handle step values: */5
        const stepMatch = pattern.match(/^\*\/(\d+)$/);
        if (stepMatch) {
            const step = parseInt(stepMatch[1], 10);
            return value % step === 0;
        }

        // Handle lists: 1,2,3
        if (pattern.includes(',')) {
            const list = pattern.split(',').map(v => parseInt(v, 10));
            return list.includes(value);
        }

        // Handle ranges: 1-5
        if (pattern.includes('-')) {
            const [start, end] = pattern.split('-').map(v => parseInt(v, 10));
            return value >= start && value <= end;
        }

        // Single value
        return parseInt(pattern, 10) === value;
    }

    /**
     * Matches current date against cron expression
     */
    private static matches(cron: string, date: Date): boolean {
        const fields = cron.split(/\s+/);
        if (fields.length !== 5) return false;

        const [min, hour, dom, month, dow] = fields;

        return (
            this.checkField(date.getMinutes(), min) &&
            this.checkField(date.getHours(), hour) &&
            this.checkField(date.getDate(), dom) &&
            this.checkField(date.getMonth() + 1, month) &&
            this.checkField(date.getDay(), dow)
        );
    }

    /**
     * Schedules a task
     * @param id Unique task ID
     * @param cron Cron expression
     * @param task Function to execute
     */
    static schedule(id: string, cron: string, task: Task) {
        this.stop(id);

        console.log(`[Scheduler] Task "${id}" scheduled with cron: ${cron}`);

        // Check every minute
        const interval = setInterval(() => {
            const now = new Date();
            if (this.matches(cron, now)) {
                console.log(`[Scheduler] Executing task: ${id} at ${now.toISOString()}`);
                task();
            }
        }, 60000); // 1 minute

        this.intervals.set(id, interval);
    }

    /**
     * Stops a scheduled task
     */
    static stop(id: string) {
        const interval = this.intervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(id);
            console.log(`[Scheduler] Task "${id}" stopped.`);
        }
    }

    /**
     * Checks if a cron expression should have triggered between two timestamps.
     * Efficiency: Iterates backwards from 'now' to 'lastSyncTs' minute-by-minute.
     * Limit: Max 1 month (44640 minutes) to prevent infinite loops or huge delays.
     */
    static shouldHaveRunSince(cron: string, lastSyncTs: number): boolean {
        const now = Date.now();
        if (lastSyncTs >= now) return false;

        // Iterate backwards minute-by-minute
        const oneMinute = 60000;
        const maxCheck = 31 * 24 * 60 * oneMinute; // 31 days max

        let checkTs = now - (now % oneMinute); // Align to the minute
        const limitTs = Math.max(lastSyncTs, now - maxCheck);

        while (checkTs > limitTs) {
            if (this.matches(cron, new Date(checkTs))) {
                // Found a scheduled time point that is AFTER our last sync
                if (checkTs > lastSyncTs) {
                    return true;
                }
            }
            checkTs -= oneMinute;
        }

        return false;
    }
}
