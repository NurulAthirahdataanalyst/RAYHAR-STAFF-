import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PageActions({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const container = document.getElementById("page-header-actions");
  if (!container) return null;

  return createPortal(children, container);
}
