/** @internal Kiểm tra PID còn sống không (dựa trên `process.kill(pid, 0)`). */

export function isPidAlive(pid: number) {

    try {

        if (!pid || typeof pid !== 'number') return false;

        process.kill(pid, 0);

        return true;

    } catch (_) {

        return false;

    }

}

