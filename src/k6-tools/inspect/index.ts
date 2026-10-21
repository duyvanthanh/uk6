import * as path from 'node:path';

import * as fs from 'node:fs';

import { parseInspectArgs } from './parseArgs.js';

import { buildForK6 } from '../build-k6.js';

import { resolveK6Path } from '../run/k6/resolveK6Path.js';

import { K6InspectError, runK6Inspect } from './runK6Inspect.js';

import { extractVuPlanFromInspect } from './plan/extractVuPlanFromInspect.js';

import { extractApiPlanFromScript } from './api-plan/extractApiPlanFromScript.js';

import { computeApiSeries } from './api-plan/computeApiSeries.js';

import { renderInspectHtml } from './render/renderInspectHtml.js';



export async function runInspectCli(): Promise<number> {

    const argv = process.argv.slice(2);



    const parsed = parseInspectArgs(argv, process.env);

    if (!parsed.ok) {

        console.error(parsed.errorMessage);

        return parsed.exitCode;

    }



    const projectRoot = process.cwd();

    const k6Path = resolveK6Path(parsed.value.k6Mode || 'auto', projectRoot);



    const outDir = path.resolve(projectRoot, parsed.value.outDir);

    fs.mkdirSync(outDir, { recursive: true });



    // Tuẩn thủ uk6 run: cũng bundle với Rollup 

    let entryToInspect = parsed.value.scriptPath;

    try {

        entryToInspect = await buildForK6(parsed.value.scriptPath);

    } catch (bundleErr: any) {

        const msg = bundleErr && bundleErr.message ? bundleErr.message : String(bundleErr || '');

        console.warn('[uk6] Failed to bundle for inspect; falling back to raw script.');

        if (msg) console.warn('[uk6] Bundle error:', msg);

    }



    let inspectJson: any;

    try {

        inspectJson = runK6Inspect({

            k6Path,

            scriptPath: entryToInspect,

            extraK6Args: parsed.value.extraK6Args,

        });

    } catch (e: any) {

        const err = e as any;

        const stderr = err && typeof err.stderr === 'string' ? err.stderr : '';

        const stdout = err && typeof err.stdout === 'string' ? err.stdout : '';

        const status = err && typeof err.status === 'number' ? err.status : null;



        const header = `[uk6] k6 inspect failed${typeof status === 'number' ? ` (exit=${status})` : ''}.`;

        console.error(header);

        if (stderr && stderr.trim()) console.error(stderr.trimEnd());

        if (stdout && stdout.trim()) console.error(stdout.trimEnd());

        if (!(e instanceof K6InspectError)) {

            const msg = e && e.message ? e.message : String(e);

            if (msg) console.error(msg);

        }



        try {

            const logPath = path.join(outDir, 'k6.inspect.error.log');

            const content = [

                header,

                '',

                stderr ? '=== stderr ===\\n' + stderr.trimEnd() : '=== stderr ===\\n<empty>',

                '',

                stdout ? '=== stdout ===\\n' + stdout.trimEnd() : '=== stdout ===\\n<empty>',

                '',

            ].join('\\n');

            fs.writeFileSync(logPath, content, 'utf8');

            console.error(`[uk6] Error log written: ${logPath}`);

        } catch (_) {

            // best-effort logging

        }



        return 1;

    }



    const plan = extractVuPlanFromInspect(inspectJson);

    const apiPlan = (() => {

        try {

            return extractApiPlanFromScript(parsed.value.scriptPath);

        } catch (e: any) {

            return { steps: [], notes: [`Failed to extract API plan: ${e && e.message ? e.message : String(e)}`] };

        }

    })();

    plan.apiPlan = apiPlan as any;

    (plan as any).apiSeries = computeApiSeries(plan as any);



    const inspectJsonPath = path.join(outDir, 'k6.inspect.json');

    const planJsonPath = path.join(outDir, 'k6.vu-plan.json');

    const htmlPath = path.join(outDir, 'k6.inspect.vu-plan.html');



    fs.writeFileSync(inspectJsonPath, JSON.stringify(inspectJson, null, 2), 'utf8');

    fs.writeFileSync(planJsonPath, JSON.stringify(plan, null, 2), 'utf8');

    fs.writeFileSync(htmlPath, renderInspectHtml(plan), 'utf8');



    console.log(`[uk6] Inspect written: ${htmlPath}`);

    return 0;

}

