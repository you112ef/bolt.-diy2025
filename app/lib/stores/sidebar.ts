import { atom } from 'nanostores';

export const sidebarOpen = atom(false);

export function toggleSidebar() {
  sidebarOpen.set(!sidebarOpen.get());
}

// Optional: function to explicitly set state
export function setSidebarOpen(isOpen: boolean) {
  sidebarOpen.set(isOpen);
}
