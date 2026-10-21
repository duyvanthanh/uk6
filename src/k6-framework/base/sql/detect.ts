export function isSelectQuery(query: string) {

  const q = String(query || "").trim();

  return /^select\b/i.test(q) || /^with\b/i.test(q);

}



