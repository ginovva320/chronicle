import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium font-heading text-white/90 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full px-4 py-2.5 rounded-elegant border border-dark-border bg-dark-surface text-white font-body',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60',
            'transition-all duration-300',
            'placeholder:text-dark-lighter',
            'hover:border-primary/30',
            'resize-none',
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

Textarea.displayName = 'Textarea';

export default Textarea;
