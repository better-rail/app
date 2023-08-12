import { isPlainObject, mapKeys, mapValues } from "lodash"

type KeyFunction = (value: unknown, key: string) => string

export const mapKeysDeep = <T>(obj: T, cb: KeyFunction): T => mapKeysDeepLodash(obj, cb, false) as T

const mapKeysDeepLodash = (obj: unknown, cb: KeyFunction, isRecursive: boolean): unknown => {
  if (!obj && !isRecursive) {
    return {}
  }

  if (!isRecursive) {
    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
      return {}
    }
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => {
      return mapKeysDeepLodash(item, cb, true)
    })
  }

  if (!isPlainObject(obj)) {
    return obj
  }

  const result = mapKeys(obj as any, cb)

  return mapValues(result, function (value) {
    return mapKeysDeepLodash(value, cb, true)
  })
}
