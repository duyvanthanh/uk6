export function buildUrl(baseUrl: string, path: string, params: Record<string, any>) {

  let url = String(baseUrl || "") + String(path || "");



  const keys = params && typeof params === "object" ? Object.keys(params) : [];

  if (keys.length === 0) return url;



  const queryString = Object.entries(params)

    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

    .join("&");

  url += `?${queryString}`;

  return url;

}



