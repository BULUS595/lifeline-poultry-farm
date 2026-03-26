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
  User, 
  Bell,
  ChevronRight,
  PlusCircle,
  PieChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Sales', path: '/sales', icon: ShoppingCart },
  { label: 'Inventory', path: '/stock', icon: Database },
  { label: 'Analytics', path: '/farms/1/analytics', icon: PieChart, roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Users', path: '/admin/users', icon: Users, roles: ['super_admin', 'admin'] },
  { label: 'Activity', path: '/admin/activity', icon: ClipboardList, roles: ['super_admin', 'admin', 'manager'] },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-transform duration-300 transform
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 flex items-center justify-center rounded-2xl border border-primary/30 shadow-glow">
                <LayoutDashboard className="w-6 h-6 text-primary" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-display font-black tracking-tighter text-foreground uppercase italic px-1">
                Life <span className="text-secondary-foreground font-black italic">Line</span>
              </h1>
            </div>
            <button 
              className="lg:hidden p-2 text-muted-foreground hover:bg-muted/30 rounded-xl"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto hide-scrollbar">
            <p className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-loose mt-4 opacity-50">Main Menu</p>
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-primary/10 text-primary font-semibold shadow-sm border border-primary/20' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                `}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110`} />
                <span className="text-[15px]">{item.label}</span>
                <ChevronRight className={`ml-auto w-4 h-4 opacity-0 transition-all duration-200 transform
                  ${location.pathname === item.path ? 'opacity-100 translate-x-0' : '-translate-x-2'}`} />
              </NavLink>
            ))}
          </nav>

          <div className="p-6 border-t border-border/50 bg-muted/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-sm overflow-hidden animate-pulse-slow">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate uppercase tracking-tight">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-muted-foreground truncate capitalize opacity-80">{user?.role?.replace('_', ' ') || 'Manager'}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              fullWidth 
              onClick={handleSignOut}
              leftIcon={LogOut}
              className="border-border/60 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive active:scale-95 py-3"
            >
              Logout System
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        <header className="sticky top-0 z-40 lg:hidden glass border-b border-border h-18 px-6 flex items-center justify-between">
          <button 
            className="p-2.5 -ml-1.5 text-foreground hover:bg-muted/30 rounded-2xl transition-all active:scale-90"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-7 h-7" />
          </button>
          
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-primary/20 flex items-center justify-center rounded-xl border border-primary/30">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-display font-black tracking-tighter uppercase italic">Life Line</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-muted-foreground hover:bg-muted/30 rounded-xl relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
            </button>
          </div>
        </header>

        <div className="hidden lg:flex items-center justify-between h-20 px-10 bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div>
            <h2 className="text-2xl font-display font-extrabold tracking-tight capitalize">
              {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 opacity-70">Welcome back to the farm control center.</p>
          </div>
          <div className="flex items-center gap-4">
             <button className="p-2.5 text-muted-foreground hover:bg-muted/20 border border-border/40 rounded-2xl transition-all hover:text-primary">
              <Bell className="w-5.5 h-5.5" />
            </button>
            <div className="h-8 w-[1px] bg-border mx-1 opacity-50" />
            <Button variant="primary" size="sm" className="rounded-2xl px-5 py-6" onClick={() => navigate('/stock')}>
               <PlusCircle className="mr-2 w-4.5 h-4.5" /> New Record
            </Button>
          </div>
        </div>

        <main className="flex-1 p-5 md:p-8 lg:px-10 lg:pb-32 animate-slide-up">
           <div className="max-w-7xl mx-auto space-y-8">
            {children}
           </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass border-t border-border mt-auto h-20 pb-safe shadow-lg">
          <div className="flex items-center justify-around h-full px-4">
            {filteredNavItems.slice(0, 4).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center gap-1.5 pt-1.5 transition-all duration-300 w-16
                    ${isActive ? 'text-primary' : 'text-muted-foreground'}
                  `}
                >
                  <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/20' : ''}`}>
                    <item.icon className="w-6.5 h-6.5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-tighter tabular-nums">{item.label}</span>
                </NavLink>
              );
            })}
             <NavLink
                  to="/profile"
                  className={({ isActive }) => `
                    flex flex-col items-center gap-1.5 pt-1.5 transition-all duration-300 w-16
                    ${isActive ? 'text-primary' : 'text-muted-foreground'}
                  `}
                >
                   <div className={`p-2 rounded-2xl transition-all duration-300 ${location.pathname === '/profile' ? 'bg-primary/20' : ''}`}>
                    <User className="w-6.5 h-6.5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-tighter tabular-nums">Profile</span>
              </NavLink>
          </div>
        </nav>
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};
