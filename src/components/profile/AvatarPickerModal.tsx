import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, User, RefreshCw } from "lucide-react";
import { AVATAR_OPTIONS, AvatarOption, saveSelectedAvatar, UserAvatar } from "@/utils/avatarUtils";
import { toast } from "sonner";

interface AvatarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarId?: string;
  userName?: string;
  userId?: string;
  onAvatarSaved?: (avatarId: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  open,
  onOpenChange,
  currentAvatarId = "initials",
  userName = "User",
  userId,
  onAvatarSaved,
}) => {
  const [selectedId, setSelectedId] = useState<string>(currentAvatarId);
  const [activeFilter, setActiveFilter] = useState<"all" | "female" | "male">("all");

  // Keep in sync when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedId(currentAvatarId);
    }
  }, [open, currentAvatarId]);

  const handleSave = () => {
    saveSelectedAvatar(selectedId, userId);
    toast.success("Profile avatar updated successfully!");
    if (onAvatarSaved) onAvatarSaved(selectedId);
    onOpenChange(false);
  };

  const filteredAvatars = AVATAR_OPTIONS.filter((opt) => {
    if (opt.id === "initials") return false; // Selectable via quick button and footer
    if (activeFilter === "all") return true;
    return opt.gender === activeFilter;
  });

  const selectedOpt = AVATAR_OPTIONS.find((a) => a.id === selectedId) || AVATAR_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-[530px] max-h-[86vh] sm:max-h-[82vh] flex flex-col bg-card border border-border/60 shadow-2xl rounded-3xl p-4 sm:p-5 gap-3 overflow-hidden">
        <DialogHeader className="shrink-0 space-y-1 pb-2 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-[#942392] font-black text-[11px] uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#942392]" />
            <span>Customize Identity</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-foreground tracking-tight">
            Choose Your Profile Avatar
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Select an avatar to display across your profile, navigation, and team views.
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview Area - Compact and responsive */}
        <div className="shrink-0 p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/20 flex items-center gap-3.5">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 via-blue-500 to-amber-400 shadow-md shrink-0">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-card p-0.5 overflow-hidden flex items-center justify-center">
              <UserAvatar avatarId={selectedId} name={userName} className="w-full h-full text-lg" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Avatar</p>
            <p className="text-sm sm:text-base font-black text-foreground truncate">{userName}</p>
            <p className="text-[11px] text-[#942392] font-semibold truncate">
              {selectedId === "initials" ? "Letter Initials" : selectedOpt.name}
            </p>
          </div>
          {selectedId !== "initials" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedId("initials")}
              className="shrink-0 h-7 text-[11px] font-bold border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg px-2.5"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Use Initials
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="shrink-0 flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground mr-0.5">Filter:</span>
            {(["all", "female", "male"] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setActiveFilter(filterKey)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  activeFilter === filterKey
                    ? "bg-[#942392] text-white shadow-sm shadow-[#942392]/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {filterKey === "all" ? "All (20)" : filterKey === "female" ? "Women / Hijab" : "Men"}
              </button>
            ))}
          </div>
          {selectedId === "initials" && (
            <Badge variant="outline" className="text-[10px] font-bold text-[#942392] border-[#942392]/30 bg-[#942392]/5">
              Initials Active
            </Badge>
          )}
        </div>

        {/* Avatars Grid - Generous horizontal padding prevents any edge clipping */}
        <div className="flex-1 min-h-[160px] max-h-[290px] overflow-y-auto px-4 py-3 sm:px-5 grid grid-cols-5 gap-3 justify-items-center">
          {filteredAvatars.map((opt) => {
            const isSelected = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedId(opt.id)}
                className={`relative group p-0.5 rounded-full flex items-center justify-center transition-all cursor-pointer outline-none ${
                  isSelected
                    ? "ring-[3px] ring-[#942392] ring-offset-2 ring-offset-background shadow-md z-10"
                    : "opacity-90 hover:opacity-100 hover:scale-105"
                }`}
                title={opt.name}
              >
                {/* Avatar circle */}
                <div className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full overflow-hidden relative shadow-xs border border-border/50 bg-card">
                  {opt.render("100%")}
                </div>

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#942392] text-white flex items-center justify-center shadow-md ring-2 ring-background z-20 pointer-events-none">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <DialogFooter className="shrink-0 pt-2.5 border-t border-border/40 flex items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedId("initials")}
            className="text-xs font-bold text-muted-foreground hover:text-foreground h-8"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reset to Initials
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="rounded-xl bg-[#942392] hover:bg-[#7a1c78] text-white text-xs font-black shadow-md shadow-[#942392]/30 px-5 h-8"
            >
              Save Avatar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
