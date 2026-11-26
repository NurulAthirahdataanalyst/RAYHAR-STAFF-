import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeaderMeta } from "./PageHeader";

function PortalSlot({
  targetId,
  children,
}: {
  targetId: string;
  children: React.ReactNode;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? document.getElementById(targetId) : null
  );

  useLayoutEffect(() => {
    const el = document.getElementById(targetId);
    if (el !== container) {
      setContainer(el);
    }
  });

  if (!container) return null;
  return createPortal(children, container);
}

/**
 * Portals right-side actions (dropdowns, filters, export buttons, custom action buttons)
 * into the shared sticky PageHeader.
 */
export default function PageActions({ children }: { children: React.ReactNode }) {
  return <PortalSlot targetId="page-header-actions">{children}</PortalSlot>;
}

/**
 * Portals a full-width secondary filter/dropdown toolbar inside the sticky PageHeader
 * directly above the separator line.
 */
export function PageToolbar({ children }: { children: React.ReactNode }) {
  return <PortalSlot targetId="page-header-toolbar">{children}</PortalSlot>;
}

export { PageHeaderMeta };
