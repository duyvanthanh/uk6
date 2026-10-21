export function getRuntimeErrors(rawEntries: any[]) {

    return (rawEntries || []).filter((entry) => entry && entry.level === 'error');

}



