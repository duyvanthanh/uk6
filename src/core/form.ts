export type FormBodyValue = string | number | boolean;



export function buildFormBody(body: Record<string, FormBodyValue>): string {

  return Object.entries(body)

    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

    .join("&");

}



