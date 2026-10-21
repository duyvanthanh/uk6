import { isPidAlive } from './isPidAlive.js';
import { killProcessTree } from './killProcessTree.js';

export type CancellationHandlers = {
    cancelK6: (signal?: NodeJS.Signals | string) => void;
    uninstall: () => void;
};

export function installCancellationHandlers(params: {
    k6Child: any;
    debugMode: boolean;
    killDelayMs?: number;
    onBeforeExit?: (() => void) | null;
}): CancellationHandlers {
    const { k6Child, debugMode, killDelayMs } = params;
    const delayMs = typeof killDelayMs === 'number' && Number.isFinite(killDelayMs) && killDelayMs >= 0 ? killDelayMs : 2000;
    const onBeforeExit = typeof params.onBeforeExit === 'function' ? params.onBeforeExit : null;

    const cancelK6 = (signal?: NodeJS.Signals | string) => {
        try {
            if (!k6Child || k6Child.killed) return;
            try {
                k6Child.kill(signal || 'SIGINT');
            } catch (_) {
                // ignore
            }
            setTimeout(() => {
                try {
                    if (k6Child.pid && isPidAlive(k6Child.pid)) {
                        killProcessTree(k6Child.pid, { debug: debugMode, label: 'k6' });
                    }
                } catch (_) {
                    // ignore
                }
            }, delayMs);
        } catch (_) {
            // ignore
        }
    };

    const onSigint = () => {
        try {
            onBeforeExit?.();
        } catch (_) {
            // ignore
        }
        try {
            if (k6Child?.pid && isPidAlive(k6Child.pid)) killProcessTree(k6Child.pid, { debug: debugMode, label: 'k6' });
        } catch (_) {
            // ignore
        }
        process.exit(130);
    };

    const onSigterm = () => {
        try {
            onBeforeExit?.();
        } catch (_) {
            // ignore
        }
        try {
            if (k6Child?.pid && isPidAlive(k6Child.pid)) killProcessTree(k6Child.pid, { debug: debugMode, label: 'k6' });
        } catch (_) {
            // ignore
        }
        process.exit(143);
    };

    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);

    const uninstall = () => {
        try {
            process.removeListener('SIGINT', onSigint);
            process.removeListener('SIGTERM', onSigterm);
        } catch (_) {
            // ignore
        }
    };

    return { cancelK6, uninstall };
}
