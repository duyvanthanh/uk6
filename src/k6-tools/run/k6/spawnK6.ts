import { spawn, type ChildProcess } from 'node:child_process';



export type K6SpawnSpec = {

    command: string;

    args: string[];

    cwd: string;

    env: NodeJS.ProcessEnv;

    options?: Record<string, unknown>;

};



export function spawnK6(spec: K6SpawnSpec): ChildProcess {
    return spawn(spec.command, spec.args, {
        env: spec.env,
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: spec.cwd,
        ...(spec.options || {}),
        windowsHide: false
    });
}


export function waitForExit(child: ChildProcess): Promise<{ status: number | null; signal: NodeJS.Signals | null }> {

    return new Promise((resolve) => {

        child.on('exit', (code, signal) => {

            resolve({ status: code, signal });

        });

    });

}



