"use client";

import { useState, type ChangeEventHandler } from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  className?: string;
}

export default function SearchInput({
  placeholder = "Search...",
  value: controlledValue,
  onChange,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState("");

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <Search
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      <input
        type="text"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`
          w-full h-8
          bg-surface-base border border-surface-border rounded-md
          pl-8 pr-3
          text-sm text-text-primary
          placeholder:text-text-muted
          outline-none
          focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30
          transition-colors duration-fast
        `}
      />
    </div>
  );
}
