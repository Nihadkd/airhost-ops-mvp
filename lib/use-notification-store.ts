import { create } from "zustand";

type NotificationState = {
  popupOpen: boolean;
  setPopupOpen: (open: boolean) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  popupOpen: false,
  setPopupOpen: (popupOpen) => set({ popupOpen }),
}));