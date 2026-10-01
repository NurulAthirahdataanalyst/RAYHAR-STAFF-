import React from 'react';

export interface TableScrollTopButtonProps {
  entriesPerPage?: number;
  threshold?: number;
  tableRef?: React.RefObject<HTMLElement | null>;
  onClick?: () => void;
  className?: string;
}

// Handled globally for all pages by GlobalScrollTopButton in AppLayout
export function TableScrollTopButton(_props: TableScrollTopButtonProps) {
  return null;
}
