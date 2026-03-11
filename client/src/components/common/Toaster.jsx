import { toast, Zoom } from "react-toastify";

export const showToast = (message, type = "success") => {
  toast(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "colored",
    transition: Zoom,
    type: type,
  });
};
