export type K6Mode = 'project' | 'local';



export type InspectArgs = {

    scriptPath: string;

    extraK6Args: string[];

    k6Mode: K6Mode | null;

    outDir: string;

};



export type ParseInspectArgsResult =

    | { ok: true; value: InspectArgs }

    | { ok: false; exitCode: number; errorMessage: string };



export function parseInspectArgs(argv: string[], _env: NodeJS.ProcessEnv): ParseInspectArgsResult {

    const inspectIndex = argv.indexOf('--inspect');

    if (inspectIndex === -1) {

        return { ok: false, exitCode: 1, errorMessage: 'Missing --inspect.' };

    }



    // Ghi nhận bất kỳ thứ tự nào của --inspect và <file_path>

    let scriptPath: string | null = null;

    let scriptIndexToRemove: number | null = null;



    const after = argv[inspectIndex + 1];

    if (after && !after.startsWith('-')) {

        scriptPath = after;

        scriptIndexToRemove = inspectIndex + 1;

    } else {

        // Tìm script argument trước --inspect

        for (let i = inspectIndex - 1; i >= 0; i -= 1) {

            const a = argv[i];

            if (!a) continue;

            if (a === '--') continue;

            if (a.startsWith('-')) continue;

            scriptPath = a;

            scriptIndexToRemove = i;

            break;

        }

    }



    if (!scriptPath) {

        return {

            ok: false,

            exitCode: 1,

            errorMessage: 'Usage: uk6 --inspect <path-to-script> [--out=<dir>] [--k6=project|local] [-- <k6-inspect-args...>]',

        };

    }



    const remaining = argv.filter((_a, i) => i !== inspectIndex && i !== scriptIndexToRemove);

    const dashDashIndex = remaining.indexOf('--');

    const beforeDashDash = dashDashIndex === -1 ? remaining : remaining.slice(0, dashDashIndex);

    const afterDashDash = dashDashIndex === -1 ? [] : remaining.slice(dashDashIndex + 1);



    let k6Mode: K6Mode | null = null;

    let outDir = 'inspect-report';

    const extraK6Args: string[] = [];



    for (const arg of beforeDashDash) {

        if (arg === '--help' || arg === '-h') continue;

        if (arg === '--k6=project') k6Mode = 'project';

        else if (arg === '--k6=local') k6Mode = 'local';

        else if (arg.startsWith('--k6=')) {

            return { ok: false, exitCode: 1, errorMessage: "Invalid value for --k6. Use 'project' or 'local'." };

        } else if (arg.startsWith('--out=')) {

            outDir = arg.slice('--out='.length).trim() || outDir;

        } else {

            extraK6Args.push(arg);

        }

    }



    extraK6Args.push(...afterDashDash);



    return { ok: true, value: { scriptPath, extraK6Args, k6Mode, outDir } };

}



