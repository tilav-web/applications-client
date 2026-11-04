import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center space-y-6">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 text-primary">
          <HelpCircle className="h-8 w-8" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-foreground">Sahifa topilmadi</h2>
        <p className="text-xs text-muted-foreground">
          Siz qidirayotgan manzil mavjud emas yoki o&apos;chirilgan bo&apos;lishi mumkin.
        </p>
      </div>

      <Link to="/">
        <Button variant="default" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Bosh sahifaga qaytish
        </Button>
      </Link>
    </div>
  );
}
