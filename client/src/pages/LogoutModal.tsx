import { useEffect, useState } from "react";
import { LogOut, X } from "lucide-react";
import { avatarPalette, getInitials } from "../utils/AvatarPalletesAndGetInitials";

type LogoutUser = {
  name: string;
  mobile?: string;
};

type LogoutModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  user?: LogoutUser;
};

export default function LogoutModal({ open, onClose, onConfirm, loading = false, user }: LogoutModalProps) {
  const [visible, setVisible] = useState(false);

  // Small mount delay so the enter transition actually animates from its start state
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [open]);

  // Lock background scroll + close on Escape while open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100000 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        className={`relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100 transition-all duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Top accent strip — same "colored accent" language used on status cards elsewhere */}
        <div className="h-1 w-full bg-rose-500" />

        {/* Decorative accent blurs — same technique as the Owner console stat cards */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-rose-50 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-blue-50 blur-2xl" />

        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center ring-4 ring-rose-50/60 mb-4">
            <LogOut size={22} className="text-rose-500" />
          </div>

          <h2 id="logout-modal-title" className="text-lg font-bold text-slate-900">
            Log out{user?.name ? `, ${user.name.split(" ")[0]}` : ""}?
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            You'll need to sign in again to access your account.
          </p>

          {user && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 p-3">
              <div
                className={`${avatarPalette[0]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0`}
              >
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                {user.mobile && <p className="text-xs text-slate-400 truncate">{user.mobile}</p>}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl ring-1 ring-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500 text-sm font-semibold text-white shadow-sm shadow-rose-200 hover:bg-rose-600 hover:shadow-md active:scale-95 transition-all disabled:opacity-60"
            >
              <LogOut size={14} />
              {loading ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}