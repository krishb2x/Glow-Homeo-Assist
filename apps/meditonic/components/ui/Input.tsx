import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg border border-mt-border bg-white px-4 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-mt-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-input",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-lg border border-mt-border bg-white px-4 py-3 text-sm ring-offset-white placeholder:text-mt-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-primary focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-input resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
