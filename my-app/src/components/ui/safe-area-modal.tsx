import { Modal, type ModalProps } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

/** A native Modal owns a separate presentation surface from the navigation screen.
 * Measure its insets here rather than inheriting the screen's (possibly zero) insets.
 * On web the provider reads CSS env(safe-area-inset-*) from the viewport.
 */
export function SafeAreaModal({ children, ...props }: ModalProps) {
  return (
    <Modal {...props}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </Modal>
  );
}
