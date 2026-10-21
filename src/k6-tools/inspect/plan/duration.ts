const UNIT_MS: Record<string, number> = {

    ns: 1e-6,

    us: 1e-3,

    'µs': 1e-3,

    ms: 1,

    s: 1000,

    m: 60 * 1000,

    h: 60 * 60 * 1000,

};



export function parseK6DurationToMs(raw: any): number {

    if (raw == null) return 0;

    const s = String(raw).trim();

    if (!s) return 0;

    if (s === '0' || s === '0s') return 0;



    let sign = 1;

    let i = 0;

    if (s[0] === '-') {

        sign = -1;

        i = 1;

    } else if (s[0] === '+') {

        i = 1;

    }



    const rest = s.slice(i);

    const re = /(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)/g;

    let total = 0;

    let matchedAny = false;

    let m: RegExpExecArray | null;

    while ((m = re.exec(rest))) {

        matchedAny = true;

        const value = Number(m[1]);

        const unit = m[2];

        const factor = UNIT_MS[unit];

        if (!Number.isFinite(value) || !factor) continue;

        total += value * factor;

    }

    if (!matchedAny) return 0;

    return Math.round(sign * total);

}



