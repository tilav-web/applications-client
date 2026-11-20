import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  RefreshCw,
  Save,
  User,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { TelegramProfileCard } from '@/components/notifications/telegram-profile-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store';
import type { AuthUser, UpdateProfileDto } from '@/types/auth';

interface ProfileEditProps {
  user: AuthUser;
  onSuccess: (updated: AuthUser) => void;
}

function PersonalInfoForm({ user, onSuccess }: ProfileEditProps) {
  const [username, setUsername] = useState(user.username || '');
  const [firstName, setFirstName] = useState(user.profile?.first_name || '');
  const [lastName, setLastName] = useState(user.profile?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user.profile?.phone_number || '');

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const payload: UpdateProfileDto = {
      username: username.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber.trim(),
    };

    try {
      setIsLoading(true);
      // Backend /auth/me ga PATCH yuboramiz
      const { data } = await apiClient.patch<AuthUser>('/auth/me', payload);
      onSuccess(data);
      setSuccessMsg("Shaxsiy ma'lumotlar muvaffaqiyatli saqlandi!");
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message === 'string'
      ) {
        setErrorMsg((err as { response: { data: { message: string } } }).response.data.message);
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        Array.isArray(
          (err as { response?: { data?: { message?: string[] } } }).response?.data?.message,
        )
      ) {
        setErrorMsg(
          (err as { response: { data: { message: string[] } } }).response.data.message.join(', '),
        );
      } else {
        setErrorMsg("Ma'lumotlarni yangilashda xatolik yuz berdi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Asosiy Ma&apos;lumotlarni Tahrirlash
          </CardTitle>
          <Badge className="bg-primary text-primary-foreground font-mono text-xs">
            {user.role || 'SUPER_ADMIN'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Username, ism, familiya va telefon raqamingizni o&apos;zgartirishingiz mumkin
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {successMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Username (Login)</span>
                <span className="text-[10px] text-muted-foreground font-mono">3 - 50 ta belgi</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-10 text-xs font-mono"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Telefon Raqam</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  users.phone_number
                </span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+998901234567"
                  className="pl-9 h-10 text-xs font-mono"
                />
              </div>
            </div>

            {/* First Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Ism</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  users.first_name
                </span>
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ismingizni kiriting"
                className="h-10 text-xs"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Familiya</span>
                <span className="text-[10px] text-muted-foreground font-mono">users.last_name</span>
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Familiyangizni kiriting"
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2 shadow-md shadow-primary/25 h-10 px-5 text-xs font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Profilni Saqlash
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordChangeForm({ onSuccess }: { onSuccess: (updated: AuthUser) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword.length < 4) {
      setErrorMsg("Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Yangi parol va tasdiqlovchi parol bir-biriga mos kelmadi');
      return;
    }

    const payload: UpdateProfileDto = {
      current_password: currentPassword.trim(),
      new_password: newPassword.trim(),
    };

    try {
      setIsLoading(true);
      const { data } = await apiClient.patch<AuthUser>('/auth/me', payload);
      onSuccess(data);
      setSuccessMsg('Parol muvaffaqiyatli yangilandi!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message === 'string'
      ) {
        setErrorMsg((err as { response: { data: { message: string } } }).response.data.message);
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        Array.isArray(
          (err as { response?: { data?: { message?: string[] } } }).response?.data?.message,
        )
      ) {
        setErrorMsg(
          (err as { response: { data: { message: string[] } } }).response.data.message.join(', '),
        );
      } else {
        setErrorMsg("Parolni o'zgartirishda xatolik yuz berdi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Xavfsizlik & Parolni Yangilash
        </CardTitle>
        <CardDescription className="text-xs">
          Parolni almashtirish uchun hozirgi parolingizni va yangi parolni kiriting
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {successMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-3xl">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Hozirgi Parol</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Amaldagi parolingiz"
                className="pl-9 pr-9 h-10 text-xs"
                required
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Yangi Parol</span>
              <span className="text-[10px] text-muted-foreground font-mono">kamida 4 belgi</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yangi kuchli parol"
                className="pl-9 pr-9 h-10 text-xs"
                required
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

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Yangi Parolni Tasdiqlang</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yangi parolni takrorlang"
                className="pl-9 pr-9 h-10 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2 shadow-md shadow-primary/25 h-10 px-5 text-xs font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yangilanmoqda...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Parolni O&apos;zgartirish
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProfilePage() {
  const { user, setUser, fetchProfile, isLoading } = useAuthStore();

  const handleSuccess = async (updated: AuthUser) => {
    setUser(updated);
    await fetchProfile();
  };

  const fullName =
    user?.profile?.first_name || user?.profile?.last_name
      ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
      : user?.username || 'Admin';

  const userInitial = fullName.charAt(0).toUpperCase();

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Overview Card */}
      <div className="p-6 rounded-2xl border border-primary/30 bg-gradient-to-r from-card/90 via-primary/10 to-card/90 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with blue glow */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-blue-400 opacity-40 blur group-hover:opacity-75 transition duration-500" />
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-2xl sm:text-3xl shadow-xl">
              {userInitial}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {fullName}
              </h1>
              <Badge className="bg-primary text-primary-foreground text-xs font-mono">
                {user?.role || 'SUPER_ADMIN'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono">
              username: @{user?.username}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-primary" />
                {user?.profile?.phone_number || 'Telefon belgilanmagan'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '2026-11-03'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProfile()}
            disabled={isLoading}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Yangilanmoqda...' : 'Sinxronlash'}
          </Button>
        </div>
      </div>

      {/* Tabs for Profile Editing */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid grid-cols-2 w-full sm:max-w-md mb-4">
          <TabsTrigger value="personal">Shaxsiy ma&apos;lumotlar</TabsTrigger>
          <TabsTrigger value="password">Xavfsizlik & Parol</TabsTrigger>
          <TabsTrigger value="notifications">Bildirishnomalar & Telegram</TabsTrigger>
        </TabsList>

        {/* Tab 1: Personal Info Form */}
        <TabsContent value="personal" className="mt-0">
          {user ? (
            <PersonalInfoForm
              key={`personal-${user.id}-${user.username}`}
              user={user}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Profil ma&apos;lumotlari yuklanmoqda...
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Password Form */}
        <TabsContent value="password" className="mt-0">
          {user ? (
            <PasswordChangeForm key={`password-${user.id}`} onSuccess={handleSuccess} />
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">Yuklanmoqda...</div>
          )}
        </TabsContent>

        {/* Tab 3: Notifications & Telegram Bot */}
        <TabsContent value="notifications" className="mt-0">
          <TelegramProfileCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
