import { create } from 'zustand'

interface UiStore {
  showGoogleLinkedModal: boolean
  setShowGoogleLinkedModal: (v: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  showGoogleLinkedModal: false,
  setShowGoogleLinkedModal: (v) => set({ showGoogleLinkedModal: v }),
}))
