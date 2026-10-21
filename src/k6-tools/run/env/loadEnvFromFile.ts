import * as fs from 'node:fs';

export function loadEnvFromFile({ filePath, env = process.env, overwrite = false }: {
    filePath: string;
    env?: NodeJS.ProcessEnv;
    overwrite?: boolean;
}) {
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*(?:export\s+)?([\w]+)\s*=\s*(.*?)\s*$/);
        if (!match) continue;
        let value = match[2];
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
        } else {
            value = value.replace(/\s*#.*$/, '').trim();
        }
        if (overwrite || env[match[1]] === undefined) env[match[1]] = value;
    }
}
