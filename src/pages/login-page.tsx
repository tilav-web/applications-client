import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { useAppStore, useAuthStore } from '@/store';
import type { LoginResponse } from '@/types/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { theme, toggleTheme } = useAppStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username va parolni to‘ldiring');
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await apiClient.post<LoginResponse>('/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });

      setAuth(data.access_token, data.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message === 'string'
      ) {
        setErrorMessage((err as { response: { data: { message: string } } }).response.data.message);
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        Array.isArray(
          (err as { response?: { data?: { message?: string[] } } }).response?.data?.message,
        )
      ) {
        setErrorMessage(
          (err as { response: { data: { message: string[] } } }).response.data.message.join(', '),
        );
      } else {
        setErrorMessage('Serverga ulanishda xatolik yuz berdi. Backend ishlayotganini tekshiring.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Ambient background glow matching #2563EB */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 blur-[140px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-600/10 blur-[100px] rounded-full -z-10 pointer-events-none" />

      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-300" />
          ) : (
            <Moon className="h-4 w-4 text-primary" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 mb-2">
            <Palette className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Arizalar bazasi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tizimga kirish uchun hisob ma&apos;lumotlaringizni kiriting
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Avtorizatsiya
              </CardTitle>
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                Real Backend API
              </Badge>
            </div>
            <CardDescription className="text-xs">
              NestJS backend orqali JWT token va Cookie sessiyasi o&apos;rnatiladi
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span>Username</span>
                  <span className="text-[10px] text-muted-foreground font-mono">auth.username</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Masalan: admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="pl-9 h-10 text-xs"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span>Parol</span>
                  <span className="text-[10px] text-muted-foreground font-mono">min 4 belgi</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Parolni kiriting"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-9 pr-9 h-10 text-xs"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-semibold shadow-lg shadow-primary/25 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Tekshirilmoqda...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Tizimga kirish
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Fill Helper */}
            <div className="pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFillDemo}
                className="w-full text-[11px] text-muted-foreground hover:text-primary gap-1.5"
              >
                <span>Standart ma&apos;lumotlarni kiritish (admin / admin123)</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-center text-[11px] text-muted-foreground space-y-1">
          <p>Arizalar bazasi • Server: 3000 • Client: 5173</p>
          <p className="flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            PostgreSQL & Redis bilan integratsiyalangan
          </p>
        </div>
      </div>
    </div>
  );
}
