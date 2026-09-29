/**
 * Tiny Zustand slice that tracks sidebar expanded/collapsed state.
 * Both Sidebar (writes) and App layout (reads) subscribe to it
 * without prop drilling.
 */
import { create } from 'zustand';

interface SidebarStore {
  isExpanded: boolean;
  toggle: ()          => void;
  setExpanded: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isExpanded: true,
  toggle:      () => set((s) => ({ isExpanded: !s.isExpanded })),
  setExpanded: (v)  => set({ isExpanded: v }),
}))

/** Pixel widths that match the Tailwind classes used in Sidebar */
export const SIDEBAR_COLLAPSED_W = 72;   // w-[72px]
export const SIDEBAR_EXPANDED_W  = 256;  // w-64
