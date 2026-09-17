import type { ElementType } from 'react';

export type NavItemData = {
  id: string;
  title: string;
  icon: ElementType;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

// A switchable entity in the sidebar's top-of-nav picker (a merchant for the BNI RM view,
// a tenant for the merchant view). Only `name` is shown when `category` is absent.
export type SwitcherEntity = {
  id: string;
  name: string;
  category?: string;
};
