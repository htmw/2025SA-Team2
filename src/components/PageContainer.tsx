import React, { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * A standardized container component for all pages in the application.
 * Ensures consistent layout, width, and spacing.
 */
const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`page-container ${className}`}>
      {children}
    </div>
  );
};

export default PageContainer; 