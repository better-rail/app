/* atomic values (not made Partial when mocking) */
type Atomic = boolean | string | number | symbol | Date

/** Mocks an indexed type (e.g. Object or Array), making it recursively Partial - note question mark  */
type PartialMockIndexed<T> = {
  [P in keyof T]?: PartialMock<T[P]>
}

/** Mock any T */
export type PartialMock<T> = T extends Atomic ? T : PartialMockIndexed<T>

/** Utility method for autocompleting a PartialMock<T> and returning it as a T */
export function partiallyMock<T>(mock: PartialMock<T>) {
  return mock as T
}
