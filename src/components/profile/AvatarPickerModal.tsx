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
    if (activeFilter === "all") return true;
    if (opt.id === "initials") return true;
    return opt.gender === activeFilter;
  });

  const selectedOpt = AVATAR_OPTIONS.find((a) => a.id === selectedId) || AVATAR_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border border-border/60 shadow-2xl rounded-[28px] p-5 sm:p-7 overflow-hidden">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2 text-[#942392] font-black text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#942392] animate-pulse" />
            <span>Customize Identity</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Choose Your Profile Avatar
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Select an illustrated avatar icon to display across your profile card, header navigation, and team views.
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview Area */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-center gap-4">
          {/* Circular avatar with rainbow gradient ring */}
          <div className="relative group shrink-0">
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 via-blue-500 via-emerald-400 to-amber-400 shadow-lg">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-card p-0.5 overflow-hidden flex items-center justify-center">
                <UserAvatar avatarId={selectedId} name={userName} className="w-full h-full" />
              </div>
            </div>
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected Avatar</p>
            <p className="text-base sm:text-lg font-black text-foreground truncate">{userName}</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-muted-foreground mr-1">Filter:</span>
          {(["all", "female", "male"] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setActiveFilter(filterKey)}
              className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                activeFilter === filterKey
                  ? "bg-[#942392] text-white shadow-md shadow-[#942392]/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {filterKey === "all" ? "All" : filterKey === "female" ? "Women / Hijab" : "Men"}
            </button>
          ))}
        </div>

        {/* Avatars Grid - Clean icons without names */}
        <div className="max-h-[320px] overflow-y-auto pr-1 py-1 grid grid-cols-4 sm:grid-cols-5 gap-3">
          {filteredAvatars.map((opt) => {
            const isSelected = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedId(opt.id)}
                className={`relative group p-2 rounded-2xl flex items-center justify-center transition-all cursor-pointer outline-none border ${
                  isSelected
                    ? "bg-[#942392]/10 border-[#942392] ring-2 ring-[#942392]/50 shadow-md scale-105"
                    : "bg-card hover:bg-muted/50 border-border/40 hover:border-border hover:scale-105"
                }`}
                title={opt.name}
              >
                {/* Avatar circle */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden p-0.5 relative transition-transform ${
                  isSelected ? "ring-2 ring-[#942392]" : "group-hover:ring-2 group-hover:ring-[#942392]/40"
                }`}>
                  {opt.id === "initials" ? (
                    <UserAvatar avatarId="initials" name={userName} className="w-full h-full" />
                  ) : (
                    opt.render("100%")
                  )}
                </div>

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#942392] text-white flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 flex items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedId("initials")}
            className="text-xs font-bold text-muted-foreground hover:text-foreground"
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
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="rounded-xl bg-[#942392] hover:bg-[#7a1c78] text-white text-xs font-black shadow-md shadow-[#942392]/30 px-5"
            >
              Save Avatar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
