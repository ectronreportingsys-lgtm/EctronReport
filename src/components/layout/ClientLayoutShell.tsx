'use client';

import { useState, createContext, useContext } from 'react';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface AuthContextType {
  userPermissions: string[];
  roleName: string;
  profile: any;
  hasPermission: (key?: string) => boolean;
}

export const AuthContext = createContext<AuthContextType>({
  userPermissions: [],
  roleName: '',
  profile: null,
  hasPermission: () => true
});

export const useAuth = () => useContext(AuthContext);

export default function ClientLayoutShell({ 
  children, 
  userPermissions = [], 
  roleName = '', 
  profile 
}: { 
  children: React.ReactNode, 
  userPermissions: string[], 
  roleName: string, 
  profile: any 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasPermission = (key?: string) => {
    if (!key) return true;
    if (roleName === 'Admin') return true;
    if (userPermissions.includes('visitor_admin') && key.startsWith('visitor_')) return true;
    return userPermissions.includes(key);
  };

  return (
    <AuthContext.Provider value={{ userPermissions, roleName, profile, hasPermission }}>
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Sidebar 
          userPermissions={userPermissions} 
          roleName={roleName} 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
        />
        <div className={clsx(
          "print:pl-0 flex flex-col min-h-screen transition-all duration-300",
          isCollapsed ? "pl-20" : "pl-64"
        )}>
          <TopNav profile={profile} roleName={roleName} />
          <main className="flex-1 p-6 relative overflow-x-hidden">
            <div className="hidden dark:block absolute top-0 left-1/4 w-96 h-96 bg-[#1b497f]/10 rounded-full blur-[110px] pointer-events-none z-0" />
            <div className="hidden dark:block absolute bottom-0 right-1/4 w-96 h-96 bg-[#00a99d]/10 rounded-full blur-[110px] pointer-events-none z-0" />
            
            <div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
