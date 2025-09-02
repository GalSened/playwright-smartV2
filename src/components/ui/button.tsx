export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '' 
}) => {
  const baseStyles = 'rounded-md font-medium transition-colors';
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50',
    ghost: 'hover:bg-gray-100'
  };
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {children}
    </button>
  );
};