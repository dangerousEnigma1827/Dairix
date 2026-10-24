import { useEffect, useState } from "react";
import { LogOut, X } from "lucide-react";
import { avatarPalette, getInitials } from "../utils/AvatarPalletesAndGetInitials";
import { createPortal } from "react-dom";

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

return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100"
        >
            <div className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <LogOut size={20} />
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <h2
                    id="logout-modal-title"
                    className="mt-4 text-lg font-semibold text-slate-900"
                >
                    Log out{user?.name ? `, ${user.name.split(" ")[0]}` : ""}?
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    You'll need to sign in again to access your account.
                </p>

                {user && (
                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                        <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarPalette[0]}`}
                        >
                            {getInitials(user.name)}
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                                {user.name}
                            </p>

                            {user.mobile && (
                                <p className="truncate text-xs text-slate-500">
                                    {user.mobile}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <LogOut size={15} />
                        {loading ? "Logging out…" : "Log out"}
                    </button>
                </div>
            </div>
        </div>
    </div>,
    document.body
)

}