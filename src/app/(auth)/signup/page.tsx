'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Name validation: letters and spaces only
  const nameValid = name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);
  const nameError = name.length > 0 && !nameValid
    ? (name.length < 2 ? 'At least 2 characters' : 'Letters and spaces only — no numbers or symbols')
    : '';

  // Email validation: must be personal domain
  const personalDomains = ['gmail.com', 'yahoo.com', 'yahoo.in', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'rediffmail.com'];
  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailDomainValid = personalDomains.includes(emailDomain);
  const emailError = email.length > 0
    ? (!emailFormatValid ? 'Invalid email format' : !emailDomainValid ? 'Use a personal email (Gmail, Yahoo, Outlook, etc.)' : '')
    : '';

  useEffect(() => {
    fetch('/api/public/departments')
      .then(r => r.json())
      .then(data => setDepartments(data.departments || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          department_id: departmentId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Success state
  if (success) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold">Request Submitted!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your registration request has been sent to the admin for verification.
            Once approved, you will receive your login credentials.
          </p>
          <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
            <p>📧 Notifications will be sent to: <span className="font-medium text-foreground">{email}</span></p>
            <p>⏳ Approval usually takes 1-2 business days</p>
            <p>🔑 You&apos;ll receive a password once approved</p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full mt-2">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mb-2">
          AF
        </div>
        <CardTitle className="text-2xl font-bold">Request Access</CardTitle>
        <CardDescription>
          Submit your details for admin verification. You&apos;ll receive login credentials once approved.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg animate-scale-in flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={nameError ? 'border-red-500/50' : name.length >= 2 && nameValid ? 'border-emerald-500/50' : ''}
            />
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
            {name.length >= 2 && nameValid && <p className="text-xs text-emerald-400">✓ Valid name</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="signup-email">Personal Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={emailError ? 'border-red-500/50' : emailFormatValid && emailDomainValid ? 'border-emerald-500/50' : ''}
            />
            {emailError && <p className="text-xs text-red-400">{emailError}</p>}
            {emailFormatValid && emailDomainValid && <p className="text-xs text-emerald-400">✓ Valid personal email</p>}
            <p className="text-[11px] text-muted-foreground">Gmail, Yahoo, Outlook, Hotmail, iCloud, ProtonMail accepted</p>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Select your department" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* No password field — notice */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">🔐 No password needed</p>
            <p>Your credentials will be generated by the admin after your identity is verified. You can change your password after first login.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !nameValid || !emailFormatValid || !emailDomainValid}
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Submit Registration Request
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have credentials?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
