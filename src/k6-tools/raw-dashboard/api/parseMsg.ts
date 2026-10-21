

/** @internal Parse `entry.msg` (string/object) về object để xử lý thống nhất. */

export function parseMsg(entry: any) {

    if (!entry) return null;

    if (entry.msg && typeof entry.msg === 'object') return entry.msg;

    if (typeof entry.msg === 'string') {

        const t = entry.msg.trim();

        if (t.startsWith('{') || t.startsWith('[')) {

            try {

                const parsed = JSON.parse(t);

                return parsed && typeof parsed === 'object' ? parsed : null;

            } catch (_) {

                return null;

            }

        }

    }

    return null;

}

