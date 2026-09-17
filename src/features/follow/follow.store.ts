import { create } from "zustand";
import type { FollowStatus } from "./follow.schema";

interface FollowState {
  statusByProfile: Record<string, FollowStatus>;
  pendingProfiles: string[];
  setStatus: (profileId: string, status: FollowStatus) => void;
  setPending: (profileId: string, pending: boolean) => void;
}

export const useFollowStore = create<FollowState>((set) => ({
  statusByProfile: {},
  pendingProfiles: [],
  setStatus: (profileId, status) => set((state) => ({
    statusByProfile: { ...state.statusByProfile, [profileId]: status },
  })),
  setPending: (profileId, pending) => set((state) => ({
    pendingProfiles: pending
      ? Array.from(new Set([...state.pendingProfiles, profileId]))
      : state.pendingProfiles.filter((id) => id !== profileId),
  })),
}));
