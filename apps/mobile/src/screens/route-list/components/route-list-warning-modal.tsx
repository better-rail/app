import { Modal, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"

import type { ResultType } from "@/models/train-routes/search-routes"

export type WarningType = Exclude<ResultType, "normal">

export interface RouteListWarningModalProps {
  visible: boolean
  title: string
  message: string
  onClose: () => void
}

export function RouteListWarningModal({ visible, title, message, onClose }: RouteListWarningModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalWrapper}>
          <Text style={styles.modalIcon}>⚠️</Text>
          <Text style={styles.modalTitle} text={title} />
          <Text style={styles.modalText} text={message} />
          <Button
            title={translate("common.ok")}
            containerStyle={styles.modalButtonContainer}
            style={styles.modalButton}
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalWrapper: {
    maxHeight: 400,
    padding: theme.spacing[4],
    marginHorizontal: theme.spacing[3],
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.modalBackground,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowColor: theme.colors.palette.black,
    shadowRadius: 2,
    shadowOpacity: 0.45,
    elevation: 6,
  },
  modalIcon: {
    fontSize: 72.5,
  },
  modalTitle: {
    marginBottom: theme.spacing[2],
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
  },
  modalText: {
    marginBottom: theme.spacing[4],
    textAlign: "center",
    fontSize: 18,
  },
  modalButton: {
    minWidth: "80%",
  },
  modalButtonContainer: {
    maxHeight: 60 * rt.fontScale,
  },
}))
