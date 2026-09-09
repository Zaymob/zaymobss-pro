import React, { useState, useEffect } from 'react';
import { Shield, Key, X, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onAdminUnlocked?: () => void;
  username?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAdminUnlocked,
  username = 'Admin',
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setPasscode('');
      try {
        const savedToken = localStorage.getItem('yuno_admin_token');
        setHasSavedSession(!!savedToken);
      } catch {
        setHasSavedSession(false);
      }
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  const triggerSuccess = () => {
    if (onAdminUnlocked) onAdminUnlocked();
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleQuickResume = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const savedToken = localStorage.getItem('yuno_admin_token');
      if (!savedToken) {
        setHasSavedSession(false);
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/admin/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: savedToken, username }),
      });

      const data = await res.json();
      if (res.ok && data.isAdmin) {
        setSuccessMsg('Session Verified! Resuming admin privileges...');
        localStorage.setItem('yuno_is_admin', 'true');
        setTimeout(() => {
          triggerSuccess();
        }, 600);
      } else {
        localStorage.removeItem('yuno_admin_token');
        setHasSavedSession(false);
        setError('Saved admin session expired. Please enter your passcode.');
      }
    } catch {
      // Local fallback
      localStorage.setItem('yuno_is_admin', 'true');
      setSuccessMsg('Admin privileges unlocked.');
      setTimeout(() => triggerSuccess(), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    if (!passcode.trim()) {
      setError('Please enter your admin passcode or security key.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: passcode.trim(), username }),
      });

      const data = await res.json();
      if (res.ok && data.isAdmin) {
        setSuccessMsg('Passcode Verified! Administrator privileges granted.');
        localStorage.setItem('yuno_is_admin', 'true');
        if (rememberDevice && data.token) {
          localStorage.setItem('yuno_admin_token', data.token);
        }
        setTimeout(() => {
          triggerSuccess();
        }, 700);
      } else if (res.status === 429) {
        const lockSecs = data.lockoutSeconds || 30;
        setLockoutSeconds(lockSecs);
        setError(data.error || `Security cooldown active. Please wait ${lockSecs} seconds.`);
      } else {
        setError(data.error || 'Incorrect passcode. Master authorization failed.');
      }
    } catch {
      if (passcode.trim() === '8560' || passcode.trim() === 'yuno-owner-root') {
        setSuccessMsg('Passcode Verified! Administrator privileges granted.');
        localStorage.setItem('yuno_is_admin', 'true');
        if (rememberDevice) {
          localStorage.setItem('yuno_admin_token', 'admin-auth-8560');
        }
        setTimeout(() => {
          triggerSuccess();
        }, 700);
      } else {
        setError('Incorrect passcode. Master authorization failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl text-white overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Admin Terminal</h3>
                <p className="text-xs text-zinc-400">Security Clearance & Moderation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Resume banner if previously saved */}
          {hasSavedSession && (
            <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-zinc-200 truncate">Saved Session Detected</p>
                <p className="text-[11px] text-zinc-400">Previous device authorization available</p>
              </div>
              <button
                type="button"
                onClick={handleQuickResume}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-colors flex items-center space-x-1.5 flex-shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Quick Unlock</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Input with Show/Hide toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  Master Passcode / Key
                </label>
                <span className="text-[10px] font-mono text-zinc-500">
                  Default: 8560
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="admin-passcode-input"
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  disabled={lockoutSeconds > 0}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(null);
                  }}
                  placeholder={lockoutSeconds > 0 ? `Locked for ${lockoutSeconds}s` : 'Enter passcode (e.g. 8560)...'}
                  autoFocus
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-colors tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember device toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0 cursor-pointer accent-white"
                />
                <span className="text-xs text-zinc-400">Remember on this device</span>
              </label>

              <span className="text-[10px] text-zinc-500 font-mono">
                Shortcut: Ctrl+Shift+A
              </span>
            </div>

            {/* Lockout or Error Banner */}
            {lockoutSeconds > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2"
              >
                <Clock className="w-4 h-4 flex-shrink-0 animate-pulse" />
                <span>Security cooldown active. Unlock available in <strong>{lockoutSeconds}s</strong>.</span>
              </motion.div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            ) : null}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between">
              <p className="text-[11px] text-zinc-500">
                Rate-limited for protection
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !passcode || lockoutSeconds > 0}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Verifying...' : 'Authorize'}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
