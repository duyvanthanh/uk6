const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";



export function encodeBase64(input: string): string {

  const browserBtoa = (globalThis as any).btoa;

  if (typeof browserBtoa === "function") {

    return browserBtoa(input);

  }



  let output = "";

  let index = 0;



  while (index < input.length) {

    const first = input.charCodeAt(index++);

    const second = index < input.length ? input.charCodeAt(index++) : Number.NaN;

    const third = index < input.length ? input.charCodeAt(index++) : Number.NaN;



    output += BASE64_CHARS[first >> 2];

    output += BASE64_CHARS[((first & 3) << 4) | ((second || 0) >> 4)];

    output += Number.isNaN(second)

      ? "="

      : BASE64_CHARS[((second & 15) << 2) | ((third || 0) >> 6)];

    output += Number.isNaN(third) ? "=" : BASE64_CHARS[third & 63];

  }



  return output;

}

