'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { Lock, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';

const POLICY_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least 1 number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'At least 1 special symbol ( . @ & )', test: (p: string) => /[.@&]/.test(p) },
  { label: 'Only letters, numbers, . @ & allowed', test: (p: string) => p.length === 0 || /^[a-zA-Z0-9.@&]+$/.test(p) },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [policyErrors, setPolicyErrors] = useState<string[]>([]);

  const allRulesPassed = POLICY_RULES.every(r => r.test(newPassword)) && newPassword.length > 0;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPolicyErrors([]);

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'weak_password') {
          setPolicyErrors(data.details || []);
        } else if (data.error === 'cooldown') {
          setError(data.message);
        } else {
          setError(data.error || 'Failed to change password');
        }
      } else {
        setSuccess('Password changed successfully! 🎉');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header title="Settings" />
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              {user?.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {user?.email}
              <Badge variant="outline" className="capitalize text-xs">{user?.role?.replace('_', ' ')}</Badge>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Change Password</CardTitle>
            </div>
            <CardDescription>
              You can change your password once every 7 days. This action is private and is not reported to the admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg animate-scale-in">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-scale-in flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> {success}
                </div>
              )}
              {policyErrors.length > 0 && (
                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg space-y-1">
                  {policyErrors.map((e, i) => (
                    <div key={i} className="flex items-center gap-2"><X className="h-3 w-3" /> {e}</div>
                  ))}
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Live Password Policy Checker */}
              {newPassword.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
                  {POLICY_RULES.map((rule, i) => {
                    const passed = rule.test(newPassword);
                    return (
                      <div key={i} className={`flex items-center gap-2 text-xs ${passed ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {passed ? <Check className="h-3 w-3 text-emerald-400" /> : <X className="h-3 w-3 text-red-400" />}
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                />
                {confirmPassword.length > 0 && (
                  <p className={`text-xs flex items-center gap-1 ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                    {passwordsMatch ? <><Check className="h-3 w-3" /> Passwords match</> : <><X className="h-3 w-3" /> Passwords do not match</>}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !allRulesPassed || !passwordsMatch}
                className="w-full gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Policy Notice */}
        <Card className="border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Password Policy</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Minimum 8 characters</li>
                  <li>At least 1 uppercase letter (A-Z)</li>
                  <li>At least 1 number (0-9)</li>
                  <li>At least 1 special character: <code className="text-primary">.</code> <code className="text-primary">@</code> <code className="text-primary">&</code></li>
                  <li>No other special characters allowed</li>
                  <li>Can be changed <strong>once per week</strong></li>
                  <li>Password changes are <strong>private</strong> — not reported to admin</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
