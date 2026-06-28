import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--tr-text-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`tr-input h-11 w-full rounded-lg px-3 text-sm placeholder:text-[var(--tr-text-faint)]
            focus:outline-none
            disabled:opacity-50 ${error ? "border-[var(--tr-red)]" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
