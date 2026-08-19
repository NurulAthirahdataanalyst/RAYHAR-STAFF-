import * as React from "react";
import { toast as sonnerToast } from "sonner";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

function toast(props: Omit<ToasterToast, "id">) {
  const { title, description, variant, action, ...rest } = props;
  
  let id;
  if (variant === "destructive") {
    id = sonnerToast.error(title, {
      description,
      ...rest
    });
  } else {
    id = sonnerToast.success(title, {
      description,
      ...rest
    });
  }

  return {
    id: id.toString(),
    dismiss: () => sonnerToast.dismiss(id),
    update: (newProps: ToasterToast) => {
      // Dummy update since sonner handles updates differently, 
      // but typical shadcn use doesn't rely heavily on this returned update function
    }
  };
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) sonnerToast.dismiss(toastId);
      else sonnerToast.dismiss();
    },
    toasts: [] // Keep empty so the Radix Toaster component renders nothing, letting Sonner handle everything
  };
}

export { useToast, toast };
