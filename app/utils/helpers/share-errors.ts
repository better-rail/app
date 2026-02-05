type ShareError = {
  message?: string
  code?: string
}

export function isShareCancelledError(error: unknown): boolean {
  if (!error) {
    return false
  }

  if (typeof error === "string") {
    return error === "User did not share" || error === "CANCELLED"
  }

  if (typeof error !== "object") {
    return false
  }

  const { message, code } = error as ShareError
  return message === "User did not share" || code === "CANCELLED"
}
