import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Database, 
  Users, 
  ClipboardList, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon, 
  Bell,
  PlusCircle,
  PieChart,
  CircleUser,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { useNotifications } from '../context/NotificationContext';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Sales', path: '/sales', icon: ShoppingCart, roles: ['super_admin', 'admin', 'manager', 'sales', 'sales_staff'] },
  { label: 'Inventory', path: '/stock', icon: Database, roles: ['super_admin', 'admin', 'manager', 'inventory_officer', 'inventory_staff'] },
  { label: 'Approvals', path: '/admin/stock', icon: ShieldCheck, roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Analytics', path: '/farms/1/analytics', icon: PieChart, roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Users', path: '/admin/users', icon: Users, roles: ['super_admin', 'admin'] },
  { label: 'Activity', path: '/admin/activity', icon: ClipboardList, roles: ['super_admin', 'admin', 'manager'] },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, markAsRead, clearAll } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.path === location.pathname);
    if (currentItem) return currentItem.label;
    if (location.pathname === '/profile') return 'Profile';
    if (location.pathname === '/admin/stock') return 'Stock Approvals';
    if (location.pathname === '/admin/sales') return 'Sales History';
    return 'Dashboard';
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-all duration-500 ease-in-out transform
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full uppercase">
          <div className="p-8 pb-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-2xl border border-primary/20 shadow-glow animate-pulse-slow">
                <LayoutDashboard className="w-7 h-7 text-primary" strokeWidth={2.5} />
              </div>
              <div className="normal-case">
                <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic px-1 leading-none">
                  Life <span className="text-primary font-black">Line</span>
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1.5 opacity-60">Farm Control</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-2.5 text-muted-foreground hover:bg-muted/50 rounded-2xl transition-all"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-6 space-y-2 overflow-y-auto hide-scrollbar">
            <p className="px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Management Console</p>
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group normal-case
                    ${isActive 
                      ? 'bg-primary/10 text-primary font-bold shadow-sm border border-primary/10' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1'}
                  `}
                >
                  <item.icon className={`w-5.5 h-5.5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[15px] tracking-tight">{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-6 m-4 mt-auto rounded-3xl bg-muted/20 border border-border/50 uppercase">
            <div className="flex items-center gap-4 mb-6 px-1 normal-case">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                 <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate tracking-tight">{user?.name || 'System Admin'}</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                  {user?.role?.replace('_', ' ') || 'Manager'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 normal-case">
              <Button 
                variant="ghost" 
                size="sm" 
                fullWidth 
                onClick={() => navigate('/profile')}
                leftIcon={CircleUser}
                className="justify-start px-3 text-muted-foreground hover:text-foreground rounded-xl"
              >
                Profile Settings
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                fullWidth 
                onClick={handleSignOut}
                leftIcon={LogOut}
                className="bg-destructive/10 text-destructive border-transparent hover:bg-destructive shadow-none rounded-xl"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Desktop Top Nav */}
        <header className="hidden lg:flex items-center justify-between h-24 px-12 bg-background/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border/50">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase">
              {getPageTitle()}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 opacity-60 font-medium">Life-Line Control Center • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className="p-3.5 text-muted-foreground hover:bg-muted/50 border border-border/50 rounded-2xl transition-all hover:text-primary active:scale-90 group relative"
              >
                <Bell className="w-6 h-6 transition-transform group-hover:rotate-12" />
                {unreadCount > 0 && (
                   <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-rose-500 rounded-full border-2 border-background text-[9px] font-black text-white">{unreadCount}</span>
                )}
              </button>
              {showNotifs && (
                 <div className="absolute right-0 top-16 w-80 bg-card border border-border/50 shadow-2xl rounded-3xl overflow-hidden z-50">
                    <div className="p-4 border-b border-border/40 flex justify-between items-center">
                       <span className="font-black text-sm uppercase">Notifications</span>
                       {unreadCount > 0 && <button onClick={clearAll} className="text-[10px] text-primary hover:underline">Mark all read</button>}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                       {notifications.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground opacity-50 text-xs italic">No activity logs</div>
                       ) : (
                          notifications.map(n => (
                             <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-4 border-b border-border/20 cursor-pointer hover:bg-muted/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
                                <p className="text-xs font-bold leading-tight mb-1">{n.message}</p>
                                <p className="text-[9px] opacity-40 uppercase tracking-widest">{new Date(n.created_at).toLocaleDateString()}</p>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              )}
            </div>
            <div className="h-10 w-px bg-border/50" />
            <Button variant="primary" size="md" className="rounded-2xl px-6 shadow-glow" onClick={() => navigate('/stock')}>
               <PlusCircle className="mr-2 w-5 h-5" /> New Record
            </Button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="sticky top-0 z-40 lg:hidden glass border-b border-border/50 h-20 px-6 flex items-center justify-between">
          <button 
            className="p-3 -ml-2 text-foreground hover:bg-muted/50 rounded-2xl transition-all active:scale-90"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-7 h-7" />
          </button>
          
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-xl border border-primary/20">
                <LayoutDashboard className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic">Life <span className="text-primary">Line</span></span>
          </div>

          <div className="flex items-center gap-2 relative">
            <button className="p-3 -mr-2 text-muted-foreground hover:bg-muted/50 rounded-2xl relative" onClick={() => setShowNotifs(!showNotifs)}>
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                 <span className="absolute top-2 right-1 flex items-center justify-center w-4 h-4 bg-rose-500 rounded-full border-2 border-background text-[8px] font-black text-white">{unreadCount}</span>
              )}
            </button>
            <button className="p-3 -mr-2 text-muted-foreground hover:bg-muted/50 rounded-2xl relative" onClick={() => navigate('/profile')}>
              <CircleUser className="w-7 h-7" />
            </button>
            {showNotifs && (
               <div className="absolute right-0 top-16 w-[90vw] max-w-sm bg-card border border-border/50 shadow-2xl rounded-3xl overflow-hidden z-50">
                  <div className="p-4 border-b border-border/40 flex justify-between items-center bg-muted/10">
                     <span className="font-black text-sm uppercase">Notifications</span>
                     {unreadCount > 0 && <button onClick={() => { clearAll(); setShowNotifs(false); }} className="text-[10px] text-primary hover:underline">Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                     {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground opacity-50 text-xs italic">No activity logs</div>
                     ) : (
                        notifications.map(n => (
                           <div key={n.id} onClick={() => { markAsRead(n.id); setShowNotifs(false); }} className={`p-4 border-b border-border/20 active:bg-muted/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
                              <p className="text-xs font-bold leading-tight mb-1">{n.message}</p>
                              <p className="text-[9px] opacity-40 uppercase tracking-widest">{new Date(n.created_at).toLocaleDateString()}</p>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto animate-slide-up bg-background/50 custom-scrollbar">
           <div className="max-w-7xl mx-auto">
            {children}
           </div>
        </main>

        {/* Mobile Bottom Navigation - Redesigned for Dark Premium Look */}
        <nav className="relative z-[100] lg:hidden bg-[#050505] border-t border-white/5 pb-safe shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-around h-24 px-4 overflow-hidden">
            {filteredNavItems.slice(0, 4).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center gap-2 transition-all duration-500 w-20 relative px-1
                    ${isActive ? 'text-primary' : 'text-white/40 hover:text-white/60'}
                  `}
                >
                  {/* Subtle bar indicator for active tab */}
                  <div className={`absolute -top-[1.5px] w-12 h-[3px] bg-primary rounded-full transition-all duration-500 shadow-[0_0_10px_2px_rgba(var(--primary-rgb),0.5)] ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />
                  
                  <div className={`
                    p-3.5 rounded-2xl transition-all duration-500 relative
                    ${isActive ? 'bg-primary/20 scale-110' : 'active:scale-95'}
                  `}>
                    <item.icon className={`w-7 h-7 transition-all ${isActive ? 'drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]' : ''}`} strokeWidth={isActive ? 3 : 2} />
                  </div>
                  
                  <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${isActive ? 'opacity-100 mt-0.5' : 'opacity-30'}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
             <NavLink
                  to="/profile"
                  className={({ isActive }) => `
                    flex flex-col items-center gap-2 transition-all duration-500 w-20 relative px-1
                    ${isActive || location.pathname === '/profile' ? 'text-primary' : 'text-white/40 hover:text-white/60'}
                  `}
                >
                   {location.pathname === '/profile' && <div className="absolute -top-[1.5px] w-12 h-[3px] bg-primary rounded-full shadow-[0_0_10px_2px_rgba(var(--primary-rgb),0.5)]" />}
                   <div className={`
                    p-3.5 rounded-2xl transition-all duration-500
                    ${location.pathname === '/profile' ? 'bg-primary/20 scale-110' : 'active:scale-95'}
                  `}>
                    <CircleUser className={`w-7 h-7 ${location.pathname === '/profile' ? 'drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]' : ''}`} strokeWidth={location.pathname === '/profile' ? 3 : 2} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${location.pathname === '/profile' ? 'opacity-100 mt-0.5' : 'opacity-30'}`}>Profile</span>
              </NavLink>
          </div>
        </nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};
