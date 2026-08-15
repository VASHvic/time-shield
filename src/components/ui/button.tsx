import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'warning' | 'secondary' | 'success';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 px-4 py-2';

    const variantStyles = {
      default: 'bg-primary-900 text-white hover:bg-primary-950',
      warning: 'bg-red-600 text-white hover:bg-red-700',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    };

    return (
      <button
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
