import { AlertCircle, Eye, EyeOff, Loader2, Lock, Moon, Shield, Sun, User } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { useAppStore, useAuthStore } from '@/store';
import type { LoginResponse } from '@/types/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { theme, toggleTheme } = useAppStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Login va parolni kiriting');
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await apiClient.post<LoginResponse>('/auth/login', {
        username: username.trim(),
        password,
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
        setErrorMessage('Login yoki parol noto‘g‘ri');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background px-4 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-300" />
          ) : (
            <Moon className="h-4 w-4 text-primary" />
          )}
        </Button>
      </div>

      <Card className="w-full max-w-sm border-border shadow-xl">
        <CardHeader className="text-center pb-2 pt-6">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">Tizimga kirish</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 pb-6">
          {errorMessage && (
            <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Login</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Loginni kiriting"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 h-10 text-sm"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parolni kiriting"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 pr-9 h-10 text-sm"
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 text-sm font-medium mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Kirilmoqda...
                </>
              ) : (
                'Kirish'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
