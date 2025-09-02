export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
    {children}
  </div>
);