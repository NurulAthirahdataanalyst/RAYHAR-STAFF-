import { Building2, Users } from "lucide-react";
import { PageHeaderMeta } from "@/components/layout/PageActions";

export default function MasterPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeaderMeta
        title={title}
        description={`Manage ${title.toLowerCase()} configurations.`}
      />

      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border shadow-sm">
        {title === "Department" ? (
          <Building2 className="w-16 h-16 text-foreground/30 mb-4" />
        ) : (
          <Users className="w-16 h-16 text-foreground/30 mb-4" />
        )}
        <h2 className="text-lg font-bold text-foreground">Coming Soon</h2>
        <p className="text-sm text-foreground mt-2 text-center max-w-sm">
          The {title} management page is currently under construction. Please check back later.
        </p>
      </div>
    </div>
  );
}
