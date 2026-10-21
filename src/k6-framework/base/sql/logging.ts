export function toLogString(value: unknown, maxLen: number) {

  let s: string;

  try {

    s = typeof value === "string" ? value : JSON.stringify(value);

  } catch (e: any) {

    s = `[unserializable: ${e?.message || String(e)}]`;

  }



  if (maxLen > 0 && s.length > maxLen) {

    return `${s.slice(0, maxLen)}...[truncated ${s.length - maxLen} chars]`;

  }

  return s;

}



