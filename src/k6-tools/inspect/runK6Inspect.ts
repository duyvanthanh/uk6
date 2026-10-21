import { spawnSync } from 'node:child_process';



type RunK6InspectParams = {

    k6Path: string;

    scriptPath: string;

    extraK6Args: string[];

};



export class K6InspectError extends Error {

    status: number | null;

    stdout: string;

    stderr: string;



    constructor(message: string, opts: { status: number | null; stdout: string; stderr: string }) {

        super(message);

        this.name = 'K6InspectError';

        this.status = opts.status;

        this.stdout = opts.stdout;

        this.stderr = opts.stderr;

    }

}



export function runK6Inspect(params: RunK6InspectParams): any {

    const args = ['inspect'];

    if (!params.extraK6Args.includes('--execution-requirements')) {

        args.push('--execution-requirements');

    }

    args.push(...params.extraK6Args, params.scriptPath);



    const res = spawnSync(params.k6Path, args, {

        encoding: 'utf8',

        maxBuffer: 20 * 1024 * 1024,

    });



    if (res.error) throw res.error;

    if (typeof res.status === 'number' && res.status !== 0) {

        const stderr = String(res.stderr || '');

        const stdout = String(res.stdout || '');

        const combined = `${stderr}\n${stdout}`.trim();

        throw new K6InspectError(combined || `k6 inspect failed with exit code ${res.status}`, {

            status: res.status,

            stdout,

            stderr,

        });

    }



    const raw = String(res.stdout || '').trim();

    try {

        return JSON.parse(raw);

    } catch (e: any) {

        throw new K6InspectError(

            `k6 inspect returned non-JSON output${e && e.message ? `: ${e.message}` : ''}`,

            { status: typeof res.status === 'number' ? res.status : null, stdout: String(res.stdout || ''), stderr: String(res.stderr || '') },

        );

    }

}



