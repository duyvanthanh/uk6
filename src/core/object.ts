/** @internal Check object thuần (không phải Array/null). */

export function isPlainObject(value: unknown): value is Record<string, unknown> {

  return value !== null && typeof value === "object" && !Array.isArray(value);

}



/** @internal Deep-merge cho body (object/array) và fallback override khi kiểu không tương thích. */

export function deepMerge(base: any, overrides: any): any {

  if (typeof overrides === "undefined") return base;

  if (base === null || typeof base === "undefined") return overrides;



  if (Array.isArray(base) && Array.isArray(overrides)) {

    const maxLen = Math.max(base.length, overrides.length);

    const result = base.slice();

    for (let i = 0; i < maxLen; i++) {

      if (i in overrides) {

        const baseVal = base[i];

        const overrideVal = overrides[i];

        if (Array.isArray(baseVal) && Array.isArray(overrideVal)) {

          result[i] = deepMerge(baseVal, overrideVal);

        } else if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {

          result[i] = deepMerge(baseVal, overrideVal);

        } else {

          result[i] = overrideVal;

        }

      }

    }

    return result;

  }



  if (!isPlainObject(base) || !isPlainObject(overrides)) return overrides;



  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(overrides)) {

    const baseVal = (base as any)[key];

    const overrideVal = (overrides as any)[key];

    if (Array.isArray(baseVal) && Array.isArray(overrideVal)) {

      (result as any)[key] = deepMerge(baseVal, overrideVal);

    } else if (isPlainObject(baseVal) && isPlainObject(overrideVal)) {

      (result as any)[key] = deepMerge(baseVal, overrideVal);

    } else {

      (result as any)[key] = overrideVal;

    }

  }

  return result;

}



