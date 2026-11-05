'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  LayoutDashboard, 
  FileText, 
  UploadCloud, 
  BrainCircuit,
  Settings,
  LogOut,
  Users,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  UserPlus,
  ListFilter,
  QrCode,
  FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/lib/supabase';
import { useLanguage } from './LanguageProvider';

interface SidebarProps {
  userPermissions?: string[];
  roleName?: string;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
}

export default function Sidebar({ userPermissions = [], roleName = '', isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  
  // Extract division from pathname (e.g. /water/dashboard -> water)
  const parts = pathname.split('/');
  const division = parts[1] && (parts[1] === 'water' || parts[1] === 'electricity' || parts[1] === 'electricity-ecs1100' || parts[1] === 'petty-cash' || parts[1] === 'visits' || parts[1] === 'visitor') ? parts[1] : 'electricity'; 

  const hasPermission = (key?: string) => {
    if (!key) return true;
    if (roleName === 'Admin') return true;
    if (userPermissions.includes('visitor_admin') && key.startsWith('visitor_')) return true;
    return userPermissions.includes(key);
  };

  const isHome = pathname === '/home' || pathname === '/coming-soon';
  
  let navItems = [];

  if (division === 'petty-cash') {
    navItems = [
      { name: t('Home', 'الرئيسية'), href: '/home', icon: Home, showAlways: true },
      { name: t('Dashboard', 'لوحة التحكم'), href: '/dashboard', icon: LayoutDashboard, permission: 'petty_cash_dashboard' },
      { name: t('Analytics', 'التحليلات'), href: '/analytics', icon: BarChart3, permission: 'petty_cash_dashboard' },
      { name: t('Employee Settlement', 'تصفية العهد'), href: '/settlement', icon: Users, permission: 'petty_cash_expenses' },
      { name: t('Resources', 'المصادر والإعدادات'), href: '/resources', icon: Settings, permission: 'petty_cash_resources' },
    ];
  } else if (division === 'visits' || division === 'visitor') {
    navItems = [
      { name: t('Home', 'الرئيسية'), href: '/home', icon: Home, showAlways: true },
      { name: t('Visitor Dashboard', 'لوحة تحكم الزوار'), href: '/visitor/dashboard', icon: LayoutDashboard, permission: 'visitor_dashboard' },
      { name: t('Register New Visit', 'تسجيل زيارة جديدة'), href: '/visitor/new', icon: UserPlus, permission: 'visitor_register' },
      { name: t('Visits List', 'قائمة الزيارات'), href: '/visitor/list', icon: ListFilter, permission: 'visitor_list' },
      { name: t('QR Code', 'رمز الاستجابة QR'), href: '/visitor/qrcode', icon: QrCode, permission: 'visitor_register' },
      { name: t('Import Excel', 'استيراد إكسل'), href: '/visitor/import', icon: FileSpreadsheet, permission: 'visitor_list' },
    ];
  } else {
    navItems = [
      { name: t('Home', 'الرئيسية'), href: '/home', icon: Home, showAlways: true },
      { name: t('Dashboard', 'لوحة التحكم'), href: '/dashboard', icon: LayoutDashboard, permission: `${division}_dashboard` },
      { name: t('Reports', 'التقارير'), href: '/reports', icon: FileText, permission: `${division}_reports` },
      { name: t('Upload Data', 'رفع البيانات'), href: '/upload', icon: UploadCloud, permission: `${division}_daily_entry` },
      { name: t('AI Analysis', 'تحليل الذكاء الاصطناعي'), href: '/analysis', icon: BrainCircuit, permission: `${division}_reports` },
    ];
  }

  // Admin items
  if (roleName === 'Admin' || userPermissions.includes('admin_panel')) {
    navItems.push({ name: t('Admin Panel', 'لوحة الإدارة'), href: '/admin/users', icon: Users, permission: 'admin_panel' });
  }

  const getHref = (baseHref: string) => {
    if (baseHref.startsWith('/admin') || baseHref === '/home' || baseHref.startsWith('/visits') || baseHref.startsWith('/visitor')) return baseHref;
    return division ? `/${division}${baseHref}` : baseHref;
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <aside className={clsx(
      "h-screen bg-card border-r border-border flex flex-col glass fixed left-0 top-0 z-40 print:hidden transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={clsx("h-16 flex items-center border-b border-border relative transition-all duration-300", isCollapsed ? "justify-center px-0" : "px-6")}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Link href="/home" className="flex items-center">
              <img 
                src="/logo.png" 
                alt="ECTRON" 
                className="h-8 w-auto max-w-[130px] object-contain" 
              />
            </Link>
            {!isHome && !pathname.startsWith('/admin') && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#14B8A6]/30 dark:bg-[#00a99d]/15 dark:text-[#00a99d] dark:border-[#00a99d]/30 capitalize shrink-0">
                {division === 'water' ? 'Siconia' : division === 'electricity-ecs1100' ? 'ECS1100' : division === 'petty-cash' ? 'Petty Cash' : (division === 'visits' || division === 'visitor') ? 'Visitor Mgmt' : 'M212'}
              </span>
            )}
          </div>
        )}
        {isCollapsed && (
          <Link href="/home" className="flex items-center justify-center px-2">
            <img 
              src="/logo.png" 
              alt="ECTRON" 
              className="h-5 w-auto max-w-[56px] object-contain" 
            />
          </Link>
        )}
        <button 
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="absolute -right-3 top-5 bg-white dark:bg-zinc-800 border border-[#E2E8F0] dark:border-zinc-700 rounded-full p-1 text-[#475569] dark:text-zinc-400 hover:text-[#0F766E] dark:hover:text-white hover:bg-[#F0FDFA] dark:hover:bg-zinc-700 z-50 transition-colors shadow-sm"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          if (item.permission && !hasPermission(item.permission)) return null;
          if (isHome && !item.showAlways && !item.href.startsWith('/admin')) return null;

          const href = getHref(item.href);
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={href}
              title={isCollapsed ? item.name : undefined}
              className={clsx(
                'relative flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'gap-3 px-3.5 py-2.5',
                isActive 
                  ? 'bg-gradient-to-r from-[#173B63] to-[#0F766E] text-white border border-[#14B8A6]/40 dark:from-[#1b497f]/15 dark:to-[#00a99d]/15 dark:text-[#00a99d] dark:border-[#00a99d]/30 font-semibold shadow-sm' 
                  : 'bg-[#F0F6FA] dark:bg-transparent border border-[#D2E3F0] dark:border-transparent text-[#173B63] dark:text-zinc-400 hover:text-[#0F766E] dark:hover:text-zinc-100 hover:bg-[#CCFBF1]/60 hover:border-[#14B8A6] dark:hover:bg-zinc-800/50'
              )}
            >
              {isActive && (
                <span className="dark:hidden absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#2DD4BF]" />
              )}
              <Icon className={clsx("w-5 h-5 flex-shrink-0", isActive ? "text-[#2DD4BF] dark:text-[#00a99d]" : "text-[#0F766E] dark:text-zinc-400")} />
              {!isCollapsed && <span className={clsx("truncate", isActive && "text-white dark:text-[#00a99d]")}>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={clsx("p-4 border-t border-border flex flex-col gap-1 transition-all duration-300", isCollapsed ? "items-center" : "")}>
        <button 
          title={isCollapsed ? "Settings" : undefined}
          className={clsx(
            "flex items-center rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-400 hover:text-[#0F766E] dark:hover:text-zinc-100 hover:bg-[#F0FDFA] dark:hover:bg-zinc-800/50 transition-all duration-200",
            isCollapsed ? "justify-center w-12 h-12 px-0" : "gap-3 px-3 py-2.5 w-full"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
        <button 
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={clsx(
            "flex items-center rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-400 hover:text-danger hover:bg-danger/10 transition-all duration-200",
            isCollapsed ? "justify-center w-12 h-12 px-0" : "gap-3 px-3 py-2.5 w-full"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
