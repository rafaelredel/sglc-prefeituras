"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createUser, generateTemporaryPassword, unlockUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Search, Lock, Unlock, Mail, Phone, Building2, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  position: string | null
  active: boolean
  locked_until: string | null
  last_login: string | null
  cityhalls: { name: string } | null
  user_roles: { name: string; slug: string }
}

interface Role {
  id: string
  name: string
  slug: string
  level: number
}

interface Cityhall {
  id: string
  name: string
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [cityhalls, setCityhalls] = useState<Cityhall[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentCityhallId, setCurrentCityhallId] = useState<string>('')

  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    personal_email: '',
    phone: '',
    position: '',
    cityhall_id: '',
    role_id: '',
  })

  useEffect(() => {
    loadData()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = () => {
    const role = localStorage.getItem('sglc_user_role') || ''
    const cityhallId = localStorage.getItem('sglc_cityhall_id') || ''
    setCurrentUserRole(role)
    setCurrentCityhallId(cityhallId)
  }

  const loadData = async () => {
    if (!supabase) return

    try {
      setLoading(true)

      // Carregar usuários
      const { data: usersData } = await supabase
        .from('users')
        .select(`
          *,
          cityhalls (name),
          user_roles (name, slug)
        `)
        .order('name')

      if (usersData) setUsers(usersData)

      // Carregar roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .order('level')

      if (rolesData) setRoles(rolesData)

      // Carregar prefeituras
      const { data: cityhallsData } = await supabase
        .from('cityhalls')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (cityhallsData) setCityhalls(cityhallsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!supabase) return

    try {
      const temporaryPassword = generateTemporaryPassword()

      await createUser({
        ...newUserData,
        cityhall_id: newUserData.cityhall_id || null,
        temporary_password: temporaryPassword,
      })

      toast.success(`Usuário criado! Senha temporária: ${temporaryPassword}`)
      setShowCreateDialog(false)
      setNewUserData({
        name: '',
        email: '',
        personal_email: '',
        phone: '',
        position: '',
        cityhall_id: '',
        role_id: '',
      })
      loadData()
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      toast.error('Erro ao criar usuário')
    }
  }

  const handleUnlockUser = async (userId: string) => {
    try {
      await unlockUser(userId)
      toast.success('Usuário desbloqueado com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error)
      toast.error('Erro ao desbloquear usuário')
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!supabase) return

    try {
      await supabase
        .from('users')
        .update({ active: !currentStatus })
        .eq('id', userId)

      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`)
      loadData()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do usuário')
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canManageUser = (user: User) => {
    if (currentUserRole === 'master') return true
    if (currentUserRole === 'admin_municipal') {
      return user.cityhalls?.name && currentCityhallId === user.cityhalls.name
    }
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e permissões do sistema</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário. Uma senha temporária será gerada automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="João da Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail Institucional *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="joao@prefeitura.gov.br"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal_email">E-mail Pessoal</Label>
                <Input
                  id="personal_email"
                  type="email"
                  value={newUserData.personal_email}
                  onChange={(e) => setNewUserData({ ...newUserData, personal_email: e.target.value })}
                  placeholder="joao@gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  value={newUserData.position}
                  onChange={(e) => setNewUserData({ ...newUserData, position: e.target.value })}
                  placeholder="Analista de Licitações"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cityhall">Prefeitura *</Label>
                <select
                  id="cityhall"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newUserData.cityhall_id}
                  onChange={(e) => setNewUserData({ ...newUserData, cityhall_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {cityhalls.map((cityhall) => (
                    <option key={cityhall.id} value={cityhall.id}>
                      {cityhall.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="role">Nível de Permissão *</Label>
                <select
                  id="role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newUserData.role_id}
                  onChange={(e) => setNewUserData({ ...newUserData, role_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={!newUserData.name || !newUserData.email || !newUserData.role_id}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Criar Usuário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                    <Badge variant={user.active ? 'default' : 'secondary'}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {user.locked_until && new Date(user.locked_until) > new Date() && (
                      <Badge variant="destructive">Bloqueado</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {user.phone}
                      </div>
                    )}
                    {user.cityhalls && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {user.cityhalls.name}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {user.user_roles.name}
                    </div>
                  </div>

                  {user.last_login && (
                    <p className="text-xs text-gray-500 mt-2">
                      Último acesso: {new Date(user.last_login).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                {canManageUser(user) && (
                  <div className="flex gap-2">
                    {user.locked_until && new Date(user.locked_until) > new Date() && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlockUser(user.id)}
                      >
                        <Unlock className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleUserStatus(user.id, user.active)}
                    >
                      {user.active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Nenhum usuário encontrado
          </CardContent>
        </Card>
      )}
    </div>
  )
}
