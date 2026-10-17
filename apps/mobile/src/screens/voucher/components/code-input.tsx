import { useEffect, useRef } from "react"
import { Pressable, TextInput, type TextInputInstance, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"

type CodeInputProps = {
  value: string
  length: number
  onChange: (value: string) => void
  editable?: boolean
  hasError?: boolean
}

/** Digit boxes over one hidden input, so the SMS code autofill (iOS/Android) fills it in one go. */
export function CodeInput({ value, length, onChange, editable = true, hasError }: CodeInputProps) {
  const inputRef = useRef<TextInputInstance>(null)

  // The input blurs while a code is checked; bring the keyboard back for the next attempt
  useEffect(() => {
    if (editable) inputRef.current?.focus()
  }, [editable])

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.container} accessible={false}>
      {/* Codes are read left to right in every language */}
      <View style={styles.boxes}>
        {Array.from({ length }, (_, index) => (
          <View
            key={index}
            style={[styles.box, index === value.length && editable && styles.boxActive, hasError && styles.boxError]}
          >
            <Text style={styles.digit}>{value[index] ?? ""}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
        editable={editable}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignSelf: "center",
  },
  boxes: {
    flexDirection: "row",
    direction: "ltr",
    gap: theme.spacing[2],
  },
  box: {
    width: 50,
    height: 60,
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 2,
    borderColor: theme.colors.separator,
    backgroundColor: theme.colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: {
    borderColor: theme.colors.primary,
  },
  boxError: {
    borderColor: theme.colors.error,
  },
  digit: {
    fontSize: 28,
    fontWeight: "700",
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: "transparent",
  },
}))
