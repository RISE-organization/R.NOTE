import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex-1 flex flex-col w-full p-6 lg:p-10">
      {children}
    </div>
  );
};

export default Layout;