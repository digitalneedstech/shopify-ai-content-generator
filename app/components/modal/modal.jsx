import { TitleBar } from "@shopify/app-bridge-react";
import { Modal, Spinner } from "@shopify/polaris";

export default function ModalComponent({
  id,
  type,
  message,
  noCallback,
  yesCallBack,
}) {
  if (type == "loading") {
    return (
      <Modal id="loader-modal">
        <Spinner accessibilityLabel="Spinner example" size="large" />
        <TitleBar title="Loading"></TitleBar>
      </Modal>
    );
  }
  return (
    <Modal id={id}>
      <p style={{ padding: "10px" }}>{message}</p>

      <TitleBar title="Confirmation Message">
        <button onClick={() => noCallback()}>No</button>
        <button onClick={() => yesCallBack()} variant="primary">
          Yes
        </button>
      </TitleBar>
    </Modal>
  );
}
