import * as fs from 'node:fs';

import * as path from 'node:path';

import type { ApiPlan, ApiPlanStep } from './types.js';



type ImportIndex = Map<string, { from: string; imported: string | null }>;



function buildImportIndex(code: string): ImportIndex {

    // Parse import theo các pattern phổ biến (không phải parser TS/JS đầy đủ):

    // - import { a, b as c } from "src/endpoints/APP";

    // - import a from "x";

    // - import * as ns from "x";

    const idx: ImportIndex = new Map();



    const importRe = /^\s*import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm;

    let m: RegExpExecArray | null;

    while ((m = importRe.exec(code))) {

        const spec = m[1].trim();

        const from = m[2].trim();



        if (spec.startsWith('{') && spec.endsWith('}')) {

            const inner = spec.slice(1, -1);

            for (const part of inner.split(',').map((s) => s.trim()).filter(Boolean)) {

                const [left, right] = part.split(/\s+as\s+/).map((s) => s.trim());

                const imported = left || null;

                const local = (right || left || '').trim();

                if (local) idx.set(local, { from, imported });

            }

            continue;

        }



        if (spec.startsWith('* as ')) {

            const local = spec.slice('* as '.length).trim();

            if (local) idx.set(local, { from, imported: '*' });

            continue;

        }



        // default import

        const local = spec.split(',')[0].trim();

        if (local) idx.set(local, { from, imported: 'default' });

    }



    return idx;

}



function findMatching(code: string, startIndex: number, openChar: string, closeChar: string): number {

    let i = startIndex;

    let depth = 0;

    let inS: string | null = null;

    let inLineComment = false;

    let inBlockComment = false;



    while (i < code.length) {

        const ch = code[i];

        const next = i + 1 < code.length ? code[i + 1] : '';



        if (inLineComment) {

            if (ch === '\n') inLineComment = false;

            i++;

            continue;

        }

        if (inBlockComment) {

            if (ch === '*' && next === '/') {

                inBlockComment = false;

                i += 2;

                continue;

            }

            i++;

            continue;

        }



        if (inS) {

            if (ch === '\\') {

                i += 2;

                continue;

            }

            if (ch === inS) {

                inS = null;

                i++;

                continue;

            }

            i++;

            continue;

        }



        if (ch === '/' && next === '/') {

            inLineComment = true;

            i += 2;

            continue;

        }

        if (ch === '/' && next === '*') {

            inBlockComment = true;

            i += 2;

            continue;

        }

        if (ch === '"' || ch === "'" || ch === '`') {

            inS = ch;

            i++;

            continue;

        }



        if (ch === openChar) {

            depth++;

        } else if (ch === closeChar) {

            depth--;

            if (depth === 0) return i;

        }

        i++;

    }

    return -1;

}



function extractOptionsScenarioKeys(code: string): string[] {

    // Parse keys của `options.scenarios` theo kiểu scan text (không parse nested object đầy đủ).

    const scenariosIdx = code.search(/\bscenarios\s*:\s*\{/m);

    if (scenariosIdx === -1) return [];

    const openBrace = code.indexOf('{', scenariosIdx);

    if (openBrace === -1) return [];

    const closeBrace = findMatching(code, openBrace, '{', '}');

    if (closeBrace === -1) return [];

    const body = code.slice(openBrace + 1, closeBrace);



    const keys: string[] = [];

    const keyRe = /(^|\s|,)\s*([A-Za-z0-9_$]+)\s*:\s*\{/gm;

    let m: RegExpExecArray | null;

    while ((m = keyRe.exec(body))) {

        keys.push(m[2]);

    }

    return Array.from(new Set(keys));

}



function extractStepsArrayText(code: string): string | null {

    const m = /\b(const|let|var)\s+steps\s*=\s*\[/m.exec(code);

    if (!m) return null;

    const openBracket = code.indexOf('[', m.index);

    if (openBracket === -1) return null;

    const closeBracket = findMatching(code, openBracket, '[', ']');

    if (closeBracket === -1) return null;

    return code.slice(openBracket + 1, closeBracket);

}



function extractCreateStepObjects(stepsArrayText: string): Array<{ objectText: string; index: number }> {

    const out: Array<{ objectText: string; index: number }> = [];

    let i = 0;

    while (i < stepsArrayText.length) {

        const idx = stepsArrayText.indexOf('createStep', i);

        if (idx === -1) break;

        const openParen = stepsArrayText.indexOf('(', idx);

        if (openParen === -1) break;

        const openBrace = stepsArrayText.indexOf('{', openParen);

        if (openBrace === -1) {

            i = openParen + 1;

            continue;

        }

        const closeBrace = findMatching(stepsArrayText, openBrace, '{', '}');

        if (closeBrace === -1) break;

        out.push({ objectText: stepsArrayText.slice(openBrace + 1, closeBrace), index: idx });

        i = closeBrace + 1;

    }

    return out;

}



function extractTopLevelObjectsFromArray(arrayText: string): Array<{ objectText: string; index: number }> {

    // Extract `{ ... }` objects trên cùng trong array body.

    const out: Array<{ objectText: string; index: number }> = [];

    let i = 0;

    while (i < arrayText.length) {

        const openBrace = arrayText.indexOf('{', i);

        if (openBrace === -1) break;

        const closeBrace = findMatching(arrayText, openBrace, '{', '}');

        if (closeBrace === -1) break;

        out.push({ objectText: arrayText.slice(openBrace + 1, closeBrace), index: openBrace });

        i = closeBrace + 1;

    }

    return out;

}



function parseStepFromObjectText(objectText: string, imports: ImportIndex, scenarioKeys: string[], filePath: string): ApiPlanStep {

    const nameMatch = /\bname\s*:\s*(['"`])([^'"`]+)\1/.exec(objectText);

    const endpointMatch = /\bendpoint\s*:\s*([A-Za-z0-9_$]+)/.exec(objectText);

    const loadMatch = /\bload\s*:\s*(\d+(?:\.\d+)?)/.exec(objectText);

    const loadModeMatch = /\bloadMode\s*:\s*(['"`])(exact|probabilistic)\1/.exec(objectText);



    const endpointRef = endpointMatch ? endpointMatch[1] : null;

    const imp = endpointRef ? imports.get(endpointRef) : null;



    return {

        scenarios: scenarioKeys.length ? scenarioKeys : ['unknown'],

        phase: 'unknown',

        blockName: null,

        stepName: nameMatch ? nameMatch[2] : null,

        endpointRef,

        endpointImportFrom: imp ? imp.from : null,

        load: loadMatch ? Number(loadMatch[1]) : null,

        loadMode: loadModeMatch ? (loadModeMatch[2] as any) : null,

        source: { file: path.resolve(filePath), line: null, col: null },

    };

}



function extractPlanArrayText(code: string): string | null {

    // Tìm `plan: [ ... ]` ở gần `createScenario(` call.

    const cs = code.indexOf('createScenario');

    if (cs === -1) return null;

    const planIdx = code.indexOf('plan', cs);

    if (planIdx === -1) return null;

    const openBracket = code.indexOf('[', planIdx);

    if (openBracket === -1) return null;

    const closeBracket = findMatching(code, openBracket, '[', ']');

    if (closeBracket === -1) return null;

    return code.slice(openBracket + 1, closeBracket);

}



type PlanBlockRef = { type: 'setup' | 'flow' | 'concurrent' | 'teardown'; arg: string | null; raw: string };



function splitTopLevelComma(listText: string): string[] {

    // Tách theo dấu "," depth 0 (parens/brackets/braces), bỏ qua strings/comments.

    const parts: string[] = [];

    let start = 0;

    let i = 0;

    let par = 0, br = 0, cr = 0;

    let inS: string | null = null;

    let inLine = false, inBlock = false;

    while (i < listText.length) {

        const ch = listText[i];

        const next = i + 1 < listText.length ? listText[i + 1] : '';

        if (inLine) { if (ch === '\n') inLine = false; i++; continue; }

        if (inBlock) { if (ch === '*' && next === '/') { inBlock = false; i += 2; continue; } i++; continue; }

        if (inS) { if (ch === '\\') { i += 2; continue; } if (ch === inS) { inS = null; i++; continue; } i++; continue; }

        if (ch === '/' && next === '/') { inLine = true; i += 2; continue; }

        if (ch === '/' && next === '*') { inBlock = true; i += 2; continue; }

        if (ch === '"' || ch === "'" || ch === '`') { inS = ch; i++; continue; }

        if (ch === '(') par++;

        else if (ch === ')') par = Math.max(0, par - 1);

        else if (ch === '[') br++;

        else if (ch === ']') br = Math.max(0, br - 1);

        else if (ch === '{') cr++;

        else if (ch === '}') cr = Math.max(0, cr - 1);

        else if (ch === ',' && par === 0 && br === 0 && cr === 0) {

            parts.push(listText.slice(start, i).trim());

            start = i + 1;

        }

        i++;

    }

    const tail = listText.slice(start).trim();

    if (tail) parts.push(tail);

    return parts.filter(Boolean);

}



function parsePlanBlocks(planText: string): PlanBlockRef[] {

    const items = splitTopLevelComma(planText);

    const blocks: PlanBlockRef[] = [];

    for (const raw of items) {

        const m = /^\s*(setups|setup|flow|concurrent|teardowns|teardown)\s*\(([\s\S]*)\)\s*$/.exec(raw);

        if (!m) continue;

        const fn = m[1];

        const argText = (m[2] || '').trim();

        const type =

            fn === 'flow'

                ? 'flow'

                : fn === 'concurrent'

                    ? 'concurrent'

                    : fn === 'setups' || fn === 'setup'

                        ? 'setup'

                        : 'teardown';

        const id = /^([A-Za-z0-9_$]+)/.exec(argText);

        blocks.push({ type, arg: id ? id[1] : null, raw });

    }

    return blocks;

}



function extractArrayInitializerBody(code: string, varName: string): string | null {

    const re = new RegExp(`\\b(const|let|var)\\s+${varName}\\s*=\\s*\\[`, 'm');

    const m = re.exec(code);

    if (!m) return null;

    const openBracket = code.indexOf('[', m.index);

    if (openBracket === -1) return null;

    const closeBracket = findMatching(code, openBracket, '[', ']');

    if (closeBracket === -1) return null;

    return code.slice(openBracket + 1, closeBracket);

}



function extractWrapperCallArrayArgBody(code: string, varName: string): { phase: ApiPlanStep['phase']; body: string } | null {

    // Supports: `const X = concurrent([ ... ])` hoặc `flow([ ... ])` hoặc `setups([ ... ])` / `teardowns([ ... ])`

    // argument đầu là ArrayExpression.

    const re = new RegExp(`\\b(const|let|var)\\s+${varName}\\s*=\\s*(concurrent|flow|setups|setup|teardowns|teardown)\\s*\\(`, 'm');

    const m = re.exec(code);

    if (!m) return null;

    const fn = m[2];

    const callOpen = code.indexOf('(', m.index);

    if (callOpen === -1) return null;

    const callClose = findMatching(code, callOpen, '(', ')');

    if (callClose === -1) return null;

    const callInner = code.slice(callOpen + 1, callClose);



    const openBracket = callInner.indexOf('[');

    if (openBracket === -1) return null;

    const closeBracket = findMatching(callInner, openBracket, '[', ']');

    if (closeBracket === -1) return null;

    const body = callInner.slice(openBracket + 1, closeBracket);



    const phase: ApiPlanStep['phase'] =

        fn === 'flow'

            ? 'flow'

            : fn === 'concurrent'

                ? 'concurrent'

                : fn === 'setups' || fn === 'setup'

                    ? 'setup'

                    : 'teardown';

    return { phase, body };

}



export function extractApiPlanFromScript(scriptPath: string): ApiPlan {

    const notes: string[] = [];

    const abs = path.isAbsolute(scriptPath) ? scriptPath : path.resolve(process.cwd(), scriptPath);

    const code = fs.readFileSync(abs, 'utf8');



    const imports = buildImportIndex(code);

    const scenarioKeys = extractOptionsScenarioKeys(code);



    const collected: ApiPlanStep[] = [];



    // parse createScenario plan blocks để đánh tag phases correctly.

    const planText = extractPlanArrayText(code);

    const blocks = planText ? parsePlanBlocks(planText) : [];

    if (!blocks.length) {

        notes.push('Could not parse createScenario plan blocks; falling back to scanning arrays by name.');

    }



    const pushStepsFromArrayVar = (varName: string, phase: ApiPlanStep['phase'], blockName: string | null) => {

        const body = extractArrayInitializerBody(code, varName);

        if (!body) return;

        const objects = extractTopLevelObjectsFromArray(body);

        for (const obj of objects) {

            const step = parseStepFromObjectText(obj.objectText, imports, scenarioKeys, abs);

            if (!step.endpointRef) continue;

            step.phase = phase;

            step.blockName = blockName;

            collected.push(step);

        }

    };



    // Đi block theo thứ tự

    for (const b of blocks) {

        if (b.arg) {

            // Case 1: setups(setupTasks) với setupTasks là biến array

            pushStepsFromArrayVar(b.arg, b.type, null);

            continue;

        }

        // inline array: e.g. flow([{...}, {...}])

        const openBracket = b.raw.indexOf('[');

        if (openBracket !== -1) {

            const closeBracket = findMatching(b.raw, openBracket, '[', ']');

            if (closeBracket !== -1) {

                const body = b.raw.slice(openBracket + 1, closeBracket);

                const objects = extractTopLevelObjectsFromArray(body);

                for (const obj of objects) {

                    const step = parseStepFromObjectText(obj.objectText, imports, scenarioKeys, abs);

                    if (!step.endpointRef) continue;

                    step.phase = b.type;

                    step.blockName = null;

                    collected.push(step);

                }

            }

        }

    }



    // Case 2: định nghĩa bởi `const X = concurrent([...])` etc.

    if (planText) {

        const planItems = splitTopLevelComma(planText);

        for (const item of planItems) {

            if (!item || item.includes('(')) continue; // already handled wrappers above

            const id = /^[A-Za-z0-9_$]+$/.exec(item.trim());

            if (!id) continue;

            const varName = id[0];

            const wrapper = extractWrapperCallArrayArgBody(code, varName);

            if (!wrapper) continue;

            // Bóc tách createStep({...}), nếu không có fall back về object-literal steps.

            const createSteps = extractCreateStepObjects(wrapper.body);

            if (createSteps.length) {

                for (const o of createSteps) {

                    const step = parseStepFromObjectText(o.objectText, imports, scenarioKeys, abs);

                    if (!step.endpointRef) continue;

                    step.phase = wrapper.phase;

                    step.blockName = varName;

                    collected.push(step);

                }

            } else {

                const objects = extractTopLevelObjectsFromArray(wrapper.body);

                for (const obj of objects) {

                    const step = parseStepFromObjectText(obj.objectText, imports, scenarioKeys, abs);

                    if (!step.endpointRef) continue;

                    step.phase = wrapper.phase;

                    step.blockName = varName;

                    collected.push(step);

                }

            }

        }

    }



    // Nếu parse plan blocks fail, fallback 

    if (!blocks.length) {

        // Pattern A: `const steps = [ createStep({...}), ... ]`

        const stepsArrayText = extractStepsArrayText(code);

        if (stepsArrayText) {

            const objects = extractCreateStepObjects(stepsArrayText);

            if (objects.length) {

                collected.push(...objects.map((o) => parseStepFromObjectText(o.objectText, imports, scenarioKeys, abs)));

            }

        }

        // Pattern B: common arrays

        const arrayDeclRe = /\b(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*\[/gm;

        let mm: RegExpExecArray | null;

        while ((mm = arrayDeclRe.exec(code))) {

            const varName = mm[2];

            if (!/(steps|flowSteps|setupTasks)$/i.test(varName)) continue;

            const openBracket = code.indexOf('[', mm.index);

            if (openBracket === -1) continue;

            const closeBracket = findMatching(code, openBracket, '[', ']');

            if (closeBracket === -1) continue;

            const body = code.slice(openBracket + 1, closeBracket);

            const objects = extractTopLevelObjectsFromArray(body);

            for (const obj of objects) {

                const step = parseStepFromObjectText(obj.objectText, imports, scenarioKeys, abs);

                if (!step.endpointRef) continue;

                const lower = String(varName).toLowerCase();

                if (lower.endsWith('setuptasks')) step.phase = 'setup';

                else if (lower.endsWith('flowsteps')) step.phase = 'flow';

                else if (lower.endsWith('teardowntasks')) step.phase = 'teardown';

                else step.phase = 'unknown';

                collected.push(step);

            }

        }

    }



    if (!collected.length) {

        notes.push(

            'No steps extracted. Supported patterns: `steps=[createStep({...})]` or arrays like `flowSteps=[{ name, endpoint, ... }]`.',

        );

    }



    // De-dup theo (stepName, endpointRef, importFrom)

    const seen = new Set<string>();

    const steps = collected.filter((s) => {

        const key = `${s.stepName || ''}::${s.endpointRef || ''}::${s.endpointImportFrom || ''}`;

        if (seen.has(key)) return false;

        seen.add(key);

        return true;

    });



    return { steps, notes };

}

