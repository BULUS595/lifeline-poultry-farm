import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.layoutWrapper}>
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={closeSidebar}></div>
      )}

      <div className={styles.mainContent}>
        <TopBar onMenuToggle={toggleSidebar} title={title} />

        <main className={styles.main}>
          <div className={styles.contentContainer}>
            {children}
          </div>
        </main>

        <footer className="w-full py-6 mt-auto text-center border-t border-[var(--color-border)]">
          <p className="text-[var(--color-text-secondary)] text-sm font-medium">
            &copy; Larry Rimamsikwe Bulus
          </p>
        </footer>
      </div>
    </div>
  );
};
