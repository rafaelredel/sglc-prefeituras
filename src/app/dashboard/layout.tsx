"use client"

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  Bell,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Processos Administrativos', href: '/dashboard/processos-administrativos' },
  { icon: BarChart3, label: 'Relatórios', href: '/dashboard/relatorios' },
  { icon: Settings, label: 'Configurações', href: '/dashboard/configuracoes' },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Dados mockados - virão do contexto/session
  const prefeituraNome = "Prefeitura Municipal de Exemplo"
  const usuarioNome = "João Silva"
  const usuarioRole = "Administrador"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Fixo */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between h-full px-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Nome da Prefeitura */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">{prefeituraNome}</span>
            </div>
          </div>

          {/* Ações do Header */}
          <div className="flex items-center gap-3">
            {/* Notificações */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* Perfil do Usuário */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{usuarioNome}</p>
                <p className="text-xs text-gray-500">{usuarioRole}</p>
              </div>
              <Avatar>
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {usuarioNome.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-20
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* Logout */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-8"
            onClick={() => {
              // Implementar logout
              window.location.href = '/login'
            }}
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </nav>
      </aside>

      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo Principal */}
      <main className="lg:pl-64 pt-16">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
