export type PushTokenAuthRetryOutcome = "success" | "failed"

const isFirebaseInstallationsAuthError = (error: unknown): error is Error =>
  error instanceof Error && error.message.includes("FIS_AUTH_ERROR")

const reportRetryOutcome = (
  onRetryFinished: ((outcome: PushTokenAuthRetryOutcome) => void) | undefined,
  outcome: PushTokenAuthRetryOutcome,
) => {
  try {
    onRetryFinished?.(outcome)
  } catch {
    // Observability must never turn a successful token request into a ride-start failure.
  }
}

export const getDevicePushTokenWithAuthRetry = async <Token>(
  getDevicePushToken: () => Promise<Token>,
  onRetryFinished?: (outcome: PushTokenAuthRetryOutcome) => void,
): Promise<Token> => {
  try {
    return await getDevicePushToken()
  } catch (error) {
    if (!isFirebaseInstallationsAuthError(error)) throw error
  }

  // FIS_AUTH_ERROR can be transient. Retry once; the expo-notifications patch guarantees this
  // invokes the native token manager again instead of replaying its cached rejected promise.
  try {
    const token = await getDevicePushToken()
    reportRetryOutcome(onRetryFinished, "success")
    return token
  } catch (error) {
    reportRetryOutcome(onRetryFinished, "failed")
    throw error
  }
}
