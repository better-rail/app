/**
 * The timetable API failing on its own side. The page answers it with its error state and a retry button, so it is
 * worth knowing about, but it is not a crash in our code.
 */
export class TimetableApiError extends Error {
  constructor(readonly status: number) {
    super(`Timetable API responded with ${status}`)
    this.name = "TimetableApiError"
  }
}
