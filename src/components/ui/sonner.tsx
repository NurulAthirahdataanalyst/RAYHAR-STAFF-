import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg pr-8",
          description: "group-[.toast]:opacity-90",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-foreground",
          closeButton: "group-[.toast]:bg-muted group-[.toast]:text-foreground group-[.toast]:hover:text-foreground group-[.toast]:border-border !opacity-100 !left-auto !right-0 !translate-x-[35%] !-translate-y-[35%]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
