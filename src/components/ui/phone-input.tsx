import React from 'react';
import { cn } from '@/lib/utils';
import { formatPhoneDisplay, cleanPhoneNumber } from '@/lib/formatters';

interface PhoneInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onFocus,
  disabled = false,
  className,
  placeholder = '99 123 4567',
}) => {
  const displayVal = formatPhoneDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const full = cleanPhoneNumber(e.target.value);
    onChange(full);
  };

  return (
    <div
      className={cn(
        'flex items-center h-10 w-full rounded-md border border-input bg-background overflow-hidden shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'opacity-60 cursor-not-allowed bg-muted/40',
        className,
      )}
    >
      <span className="h-full flex items-center px-3 bg-muted/50 border-r border-input text-xs font-mono font-bold text-foreground select-none">
        +998
      </span>
      <input
        type="tel"
        inputMode="numeric"
        disabled={disabled}
        value={displayVal}
        onChange={handleChange}
        onFocus={onFocus}
        placeholder={placeholder}
        maxLength={11}
        className="flex-1 h-full bg-transparent px-3 text-xs font-mono font-medium outline-none text-foreground placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
    </div>
  );
};

