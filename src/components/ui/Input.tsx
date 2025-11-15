import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium font-heading text-white/90 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full px-4 py-2.5 rounded-elegant border border-dark-border bg-dark-surface text-white font-body',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60',
            'transition-all duration-300',
            'placeholder:text-dark-lighter',
            'hover:border-primary/30',
            error && 'border-accent focus:ring-accent/40',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-accent animate-slide-down">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
