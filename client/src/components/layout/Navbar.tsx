import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuthStore } from '@/stores/authStore'
import { BarChart3, LogOut, LayoutDashboard, Briefcase, Menu } from 'lucide-react'

export default function Navbar() {
  const { email, logout } = useAuthStore()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const navLinks = (
    <>
      <Link to="/" onClick={() => setOpen(false)}>
        <Button
          variant={location.pathname === '/' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-2 w-full justify-start sm:w-auto"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link to="/portfolio" onClick={() => setOpen(false)}>
        <Button
          variant={location.pathname === '/portfolio' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-2 w-full justify-start sm:w-auto"
        >
          <Briefcase className="h-4 w-4" />
          Portfolio
        </Button>
      </Link>
    </>
  )

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <BarChart3 className="h-5 w-5 text-green-500" />
            <span>MARKET PULSE</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {navLinks}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{email}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex flex-col gap-2 mt-8">
                <span className="text-sm text-muted-foreground px-3 mb-2">{email}</span>
                {navLinks}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
