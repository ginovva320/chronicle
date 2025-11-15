import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-elegant font-semibold font-body transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none border hover:scale-[1.02]';

    const variants = {
      primary: 'bg-primary border-primary text-dark hover:bg-primary-400 hover:border-primary-400 focus:ring-primary/50 hover:shadow-warm',
      secondary: 'bg-dark-surface border-dark-border text-white hover:bg-dark-lighter hover:border-primary/30 focus:ring-primary/30 hover:shadow-warm',
      ghost: 'border-transparent text-white hover:bg-dark-surface/50 hover:border-primary/20 focus:ring-primary/30',
      danger: 'bg-accent border-accent text-white hover:bg-accent-400 hover:border-accent-400 focus:ring-accent/50 hover:shadow-coral'
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-2.5 text-base',
      lg: 'px-8 py-3 text-lg'
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
