import { Building2, Users } from "lucide-react";

export default function MasterPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground uppercase">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage {title.toLowerCase()} configurations.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border shadow-sm">
        {title === "Department" ? (
          <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
        ) : (
          <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
        )}
        <h2 className="text-lg font-bold text-foreground">Coming Soon</h2>
        <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
          The {title} management page is currently under construction. Please check back later.
        </p>
      </div>
    </div>
  );
}
