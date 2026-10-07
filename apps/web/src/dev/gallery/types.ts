import type { ReactNode } from "react";

export interface GalleryEntry {
  id: string;
  group: string;
  title: string;
  render: (log: (action: string) => void) => ReactNode;
}
