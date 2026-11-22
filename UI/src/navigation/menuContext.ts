import { createContext, useContext } from 'react';

export type MenuContextValue = { openMenu: () => void };

/** Set by the menu (Menu.tsx) around the signed-in stack. */
export const MenuContext = createContext<MenuContextValue | null>(null);

/** Opens the menu. Null outside the signed-in stack (e.g. in a screen test), then there is no menu button. */
export function useMenu(): MenuContextValue | null {
  return useContext(MenuContext);
}
