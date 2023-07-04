import { create } from 'zustand'

const useAppStore = create((set) => ({
  darkMode: false,
  setMode: (mode) => set({ darkMode: mode }),
}))

export default useAppStore