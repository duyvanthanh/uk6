export function buildChildEnv({ baseEnv = process.env, useProxy = false }: {
    baseEnv?: NodeJS.ProcessEnv;
    useProxy?: boolean;
}) {
    const env = { ...baseEnv };
    if (!useProxy) {
        for (const key of Object.keys(env)) {
            if (/^(http|https|all|no)_proxy$/i.test(key)) delete env[key];
        }
        env.NO_PROXY = '*';
        env.no_proxy = '*';
    }
    return env;
}
