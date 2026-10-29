import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAccount } from '../types/store';

interface AuthModalProps {
  storeName: string;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  storeName,
  onLoginSuccess,
}) => {
  const { isLoginModalOpen, setIsLoginModalOpen, login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoginModalOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setPassword('');
  };

  const handleClose = () => {
    resetForm();
    setIsLoginModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const loggedUser = await login(email, password);
        setIsLoginModalOpen(false);
        resetForm();
        onLoginSuccess(loggedUser);
      } else {
        const newUser = await register({ name, email, phone, password });
        setIsLoginModalOpen(false);
        resetForm();
        onLoginSuccess(newUser);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Authentication failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-xs"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white border border-[#E6DEC8] shadow-2xl overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-[#FAF7F2] border-b border-[#E6DEC8] flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="typo-h3 text-[#1E1410]">
              {mode === 'login' ? 'Sign In to Your Account' : 'Create Customer Account'}
            </h3>
            <p className="typo-caption text-[#6E5A4F] mt-0.5">
              {storeName} · Customer &amp; Administrator Portal
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close login modal"
            className="p-1.5 rounded-lg text-[#5A463C] hover:bg-[#EFE7DA] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4ECE1] rounded-xl border border-[#E6DEC8]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`typo-btn py-2 rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#1E1410] shadow-xs'
                  : 'text-[#6E5A4F] hover:text-[#1E1410]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`typo-btn py-2 rounded-lg transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#1E1410] shadow-xs'
                  : 'text-[#6E5A4F] hover:text-[#1E1410]'
              }`}
            >
              Register (Customer)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] typo-caption-medium text-[#991B1B]">
              {errorMsg}
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label
                  htmlFor="auth-name"
                  className="block typo-label font-semibold text-[#1E1410] mb-1.5"
                >
                  Full Name <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8C776B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-white border border-[#D8C8B4] text-[#1E1410] placeholder-[#9A8579] focus:outline-none focus:border-[#8B3A2B]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-phone"
                  className="block typo-label font-semibold text-[#1E1410] mb-1.5"
                >
                  WhatsApp Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8C776B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-white border border-[#D8C8B4] font-mono-num text-[#1E1410] placeholder-[#9A8579] focus:outline-none focus:border-[#8B3A2B]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block typo-label font-semibold text-[#1E1410] mb-1.5"
            >
              Email Address <span className="text-[#B91C1C]">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C776B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-white border border-[#D8C8B4] text-[#1E1410] placeholder-[#9A8579] focus:outline-none focus:border-[#8B3A2B]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block typo-label font-semibold text-[#1E1410] mb-1.5"
            >
              Password <span className="text-[#B91C1C]">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C776B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white border border-[#D8C8B4] text-[#1E1410] placeholder-[#9A8579] focus:outline-none focus:border-[#8B3A2B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C776B] hover:text-[#1E1410]"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {mode === 'register' && (
              <p className="typo-caption text-[#7A6558] mt-1">
                At least 6 characters containing letters and numbers or symbols.
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="typo-btn w-full py-3 px-5 rounded-lg bg-[#1E1410] hover:bg-[#8B3A2B] disabled:opacity-60 text-white transition-colors cursor-pointer"
            >
              {submitting
                ? mode === 'login'
                  ? 'Signing In...'
                  : 'Creating Account...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </div>

          <p className="text-center typo-caption text-[#6E5A4F] pt-1">
            {mode === 'login'
              ? 'Administrators are automatically directed to the Admin Dashboard upon sign in.'
              : 'Already have an account? Switch to Sign In above.'}
          </p>
        </form>
      </div>
    </div>
  );
};
