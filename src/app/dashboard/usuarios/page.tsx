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
  email: string
  user_metadata: {
    name?: string
    role?: string
    cityhall_id?: string
    phone?: string
    position?: string
    active?: boolean
  }
  last_sign_in_at: string | null
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

      // Obter usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const currentUserMetadata = currentUser?.user_metadata || {}
      const currentRole = currentUserMetadata.role || 'operacional'
      const currentCityhall = currentUserMetadata.cityhall_id || null

      // Carregar usuários do Auth
      const { data: { users: authUsers }, error: usersError } = await supabase.auth.admin.listUsers()

      if (usersError) {
        console.error('Erro ao carregar usuários:', usersError)
        toast.error('Erro ao carregar usuários')
        return
      }

      // Aplicar filtros baseados no nível de acesso
      let filteredUsers = authUsers || []

      if (currentRole === 'master') {
        // Administrador Geral vê TODOS os usuários
        console.log('✅ Administrador Geral - Mostrando todos os usuários')
      } else if (currentRole === 'admin_municipal') {
        // Administrador da Prefeitura vê apenas usuários da sua prefeitura
        filteredUsers = filteredUsers.filter(user => {
          const userCityhall = user.user_metadata?.cityhall_id
          return userCityhall === currentCityhall
        })
        console.log(`✅ Administrador Municipal - Mostrando usuários da prefeitura ${currentCityhall}`)
      } else {
        // Usuário Operacional não vê outros usuários
        filteredUsers = []
        console.log('✅ Usuário Operacional - Sem permissão para ver usuários')
      }

      setUsers(filteredUsers)

      // Carregar roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .order('level')

      if (rolesData) setRoles(rolesData)

      // Carregar prefeituras
      let cityhallsQuery = supabase
        .from('cityhalls')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      // Se for admin municipal, mostrar apenas sua prefeitura
      if (currentRole === 'admin_municipal' && currentCityhall) {
        cityhallsQuery = cityhallsQuery.eq('id', currentCityhall)
      }

      const { data: cityhallsData } = await cityhallsQuery

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

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!supabase) return

    try {
      // Atualizar metadados do usuário no Auth
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          active: !currentStatus
        }
      })

      if (error) throw error

      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`)
      loadData()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do usuário')
    }
  }

  const filteredUsers = users.filter(user => {
    const name = user.user_metadata?.name || user.email || ''
    const email = user.email || ''
    const searchLower = searchTerm.toLowerCase()
    
    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower)
  })

  const canManageUsers = () => {
    return currentUserRole === 'master' || currentUserRole === 'admin_municipal'
  }

  const getRoleName = (roleSlug: string) => {
    const role = roles.find(r => r.slug === roleSlug)
    return role?.name || roleSlug
  }

  const getCityhallName = (cityhallId: string) => {
    const cityhall = cityhalls.find(c => c.id === cityhallId)
    return cityhall?.name || 'Sem prefeitura'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!canManageUsers()) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">Você não tem permissão para gerenciar usuários.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-1">
            {currentUserRole === 'master' 
              ? 'Gerencie todos os usuários do sistema' 
              : 'Gerencie usuários da sua prefeitura'}
          </p>
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
                <Label htmlFor="cityhall">
                  Prefeitura {currentUserRole === 'master' ? '*' : ''}
                </Label>
                <select
                  id="cityhall"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newUserData.cityhall_id}
                  onChange={(e) => setNewUserData({ ...newUserData, cityhall_id: e.target.value })}
                  disabled={currentUserRole === 'admin_municipal'}
                >
                  <option value="">
                    {currentUserRole === 'master' ? 'Selecione...' : 'Nenhuma (Admin Master)'}
                  </option>
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
                  {roles
                    .filter(role => {
                      // Admin municipal não pode criar master
                      if (currentUserRole === 'admin_municipal' && role.slug === 'master') {
                        return false
                      }
                      return true
                    })
                    .map((role) => (
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
        {filteredUsers.map((user) => {
          const metadata = user.user_metadata || {}
          const isActive = metadata.active !== false
          const userName = metadata.name || user.email?.split('@')[0] || 'Usuário'
          const userRole = metadata.role || 'operacional'
          const userCityhall = metadata.cityhall_id

          return (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{userName}</h3>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                      {metadata.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {metadata.phone}
                        </div>
                      )}
                      {userCityhall && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {getCityhallName(userCityhall)}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {getRoleName(userRole)}
                      </div>
                    </div>

                    {user.last_sign_in_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Último acesso: {new Date(user.last_sign_in_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleUserStatus(user.id, isActive)}
                    >
                      {isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
