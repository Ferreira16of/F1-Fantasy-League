import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, Shield, Trophy, Users, LayoutDashboard } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Classificação", href: "/standings", icon: Trophy },
    { name: "Ligas", href: "/leagues", icon: Flag },
    { name: "Amigos", href: "/friends", icon: Users },
  ];

  if (user?.isAdmin) {
    navigation.push({ name: "Admin", href: "/admin", icon: Shield });
  }

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link key={item.name} href={item.href} onClick={() => setOpen(false)}>
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground dark flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <Link href="/dashboard">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="F1 Draft League" className="h-10 w-10 object-contain" />
            <span className="text-primary font-black text-xl tracking-tighter italic">F1 DRAFT</span>
          </div>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-card border-r-border p-0 flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="F1 Draft League" className="h-10 w-10 object-contain" />
                <span className="text-primary font-black text-2xl tracking-tighter italic">F1 DRAFT</span>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              <NavLinks />
            </nav>
            <div className="p-4 border-t border-border space-y-4">
              <div className="flex items-center gap-3 px-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                  {user?.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold">{user?.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user?.handle}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Link href="/profile" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <User className="h-4 w-4" /> Perfil
                  </Button>
                </Link>
                <Button variant="destructive" className="w-full justify-start gap-2" onClick={logout}>
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src="/logo.png" alt="F1 Draft League" className="h-12 w-12 object-contain" />
              <span className="text-primary font-black text-2xl tracking-tighter italic">F1 DRAFT</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-border">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold border border-border">
              {user?.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">@{user?.handle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/profile" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <User className="h-4 w-4 mr-2" /> Perfil
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
