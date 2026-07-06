import { useState } from "react";
import api from "../../../api/api";
import toast from "react-hot-toast";
import {
    X,
    User,
    Phone,
    Loader2,
    Truck,
    RefreshCcw,
    KeyRound,
    Copy,
    Check,
} from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

const generatePassword = (length = 10) => {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";

    let password = "";

    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
};

const initialFormState = () => ({
    name: "",
    phone: "",
    password: generatePassword(),
});

function AddDMModal({ isOpen, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
    const [formData, setFormData] = useState(initialFormState);

    const handleRefreshPassword = () => {
        setFormData((prev) => ({
            ...prev,
            password: generatePassword(),
        }));
        setCopied(false);
    };

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(formData.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch{
        }
    };

    const handleClose = () => {
        setFormData(initialFormState());
        setErrors({});
        setCopied(false);
        onClose();
    };

    const handleAddDM = async () => {
        try {
            setLoading(true);

            const payload = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                password: formData.password,
            };

            let req=await api.post("/dm", payload);

            toast(`DM created! Password: ${formData.password}`, {
                style: { background: "#1E88E5", color: "#fff" },
            });

            handleClose();
        }catch(err:any) {
            console.log("error adding DM", err);

            if (err?.response?.data?.message === "Validation Error") {
                toast("Validation error — check the highlighted fields", {
                    style: { background: "#1E88E5", color: "#fff" },
                });
            } else {
                toast("Couldn't create DM. Try again.", {
                    style: { background: "#1E88E5", color: "#fff" },
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto h-[100vh] bg-black/40 p-4 py-10 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                            <Truck size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Add delivery staff
                            </h2>
                            <p className="text-sm text-slate-500">
                                Creates a login for a new DM
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="flex flex-col gap-4 px-6 py-6">

                    {/* Name */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Name
                        </label>

                        <div className="relative">
                            <User
                                size={18}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                                }}
                                placeholder="Ravi Kumar"
                                className={`w-full rounded-xl border bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 ${
                                    errors.name ? "border-red-300" : "border-slate-200"
                                }`}
                            />
                        </div>
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Phone number
                        </label>

                        <div className="relative">
                            <Phone
                                size={18}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={formData.phone}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, phone: e.target.value }));
                                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                                }}
                                placeholder="9876543210"
                                inputMode="numeric"
                                className={`w-full rounded-xl border bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 ${
                                    errors.phone ? "border-red-300" : "border-slate-200"
                                }`}
                            />
                        </div>
                        {errors.phone && (
                            <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Generated password
                        </label>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <KeyRound
                                    size={18}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={formData.password}
                                    readOnly
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 font-mono text-sm text-slate-700 outline-none"
                                />
                            </div>

                            <button
                                onClick={handleCopyPassword}
                                aria-label="Copy password"
                                title="Copy password"
                                className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                            </button>

                            <button
                                onClick={handleRefreshPassword}
                                aria-label="Generate new password"
                                title="Generate new password"
                                className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                                <RefreshCcw size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <KeyRound size={16} className="mt-0.5 shrink-0" />
                        <span>Share this password with the DM — they'll use it to log in.</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleAddDM}
                        disabled={loading}
                        className="flex min-w-[110px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Adding…
                            </>
                        ) : (
                            "Add DM"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddDMModal;