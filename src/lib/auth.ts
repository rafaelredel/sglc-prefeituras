import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  cityhall_id: string | null
  active: boolean
  require_password_change: boolean
}

export interface LoginCredentials {
  email: string
  password: string
  cityhall_id?: string
}

export interface CreateUserData {
  name: string
  email: string
  personal_email?: string
  phone?: string
  position?: string
  cityhall_id: string | null
  role_id: string
  temporary_password: string
}

/**
 * Realiza login do usuário
 */
export async function loginUser(credentials: LoginCredentials) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  try {
    // Autenticar com Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (authError) throw authError

    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_roles (
          slug,
          name,
          level,
          permissions
        ),
        cityhalls (
          id,
          name,
          status
        )
      `)
      .eq('auth_user_id', authData.user.id)
      .single()

    if (userError || !userData) {
      throw new Error('Usuário não encontrado no sistema')
    }

    // Verificar se usuário está ativo
    if (!userData.active) {
      throw new Error('Usuário inativo. Contate o administrador.')
    }

    // Verificar se conta está bloqueada
    if (userData.locked_until && new Date(userData.locked_until) > new Date()) {
      throw new Error('Conta bloqueada. Contate o administrador.')
    }

    // Verificar se prefeitura está ativa (se não for master e tiver prefeitura)
    if (userData.cityhall_id && userData.cityhalls?.status !== 'active') {
      throw new Error('Prefeitura inativa. Contate o administrador.')
    }

    // Atualizar último acesso
    await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        failed_login_attempts: 0,
      })
      .eq('id', userData.id)

    // Registrar log de login
    await supabase.from('login_logs').insert({
      user_id: userData.id,
      success: true,
      ip: await getClientIP(),
      user_agent: navigator.userAgent,
    })

    return {
      user: userData,
      session: authData.session,
    }
  } catch (error) {
    // Registrar tentativa falha
    if (credentials.email) {
      const { data: user } = await supabase!
        .from('users')
        .select('id, failed_login_attempts')
        .eq('email', credentials.email)
        .single()

      if (user) {
        const newAttempts = (user.failed_login_attempts || 0) + 1
        const updates: Record<string, unknown> = {
          failed_login_attempts: newAttempts,
        }

        // Bloquear após 5 tentativas
        if (newAttempts >= 5) {
          updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        }

        await supabase!.from('users').update(updates).eq('id', user.id)

        await supabase!.from('login_logs').insert({
          user_id: user.id,
          success: false,
          failure_reason: error instanceof Error ? error.message : 'Erro desconhecido',
          ip: await getClientIP(),
          user_agent: navigator.userAgent,
        })
      }
    }

    throw error
  }
}

/**
 * Realiza logout do usuário
 */
export async function logoutUser() {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  const { error } = await supabase.auth.signOut()
  if (error) throw error

  // Limpar localStorage
  localStorage.removeItem('sglc_user_id')
  localStorage.removeItem('sglc_cityhall_id')
  localStorage.removeItem('sglc_user_role')
  localStorage.removeItem('sglc_user_name')
}

/**
 * Solicita redefinição de senha
 */
export async function requestPasswordReset(email: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  // Verificar se usuário existe
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (!user) {
    throw new Error('E-mail não encontrado')
  }

  // Enviar e-mail de redefinição
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) throw error

  // Registrar log
  await supabase.from('password_reset_logs').insert({
    user_id: user.id,
    ip: await getClientIP(),
  })
}

/**
 * Redefine senha do usuário
 */
export async function resetPassword(newPassword: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error

  // Atualizar flag de troca obrigatória
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (userData) {
    await supabase
      .from('users')
      .update({ require_password_change: false })
      .eq('id', userData.id)

    // Registrar log
    await supabase.from('password_reset_logs').update({
      reset_time: new Date().toISOString(),
    }).eq('user_id', userData.id).is('reset_time', null)
  }
}

/**
 * Cria novo usuário (apenas admin)
 */
export async function createUser(data: CreateUserData) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.temporary_password,
    email_confirm: true,
  })

  if (authError) throw authError

  // Criar registro na tabela users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      name: data.name,
      email: data.email,
      personal_email: data.personal_email,
      phone: data.phone,
      position: data.position,
      cityhall_id: data.cityhall_id,
      role_id: data.role_id,
      require_password_change: true,
    })
    .select()
    .single()

  if (userError) throw userError

  // Registrar auditoria
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    const { data: currentUserData } = await supabase
      .from('users')
      .select('id, cityhall_id')
      .eq('auth_user_id', currentUser.id)
      .single()

    if (currentUserData) {
      await supabase.from('audit_logs').insert({
        user_id: currentUserData.id,
        cityhall_id: currentUserData.cityhall_id,
        action: 'create_user',
        entity_type: 'user',
        entity_id: userData.id,
        details: { email: data.email, name: data.name },
        ip: await getClientIP(),
        user_agent: navigator.userAgent,
      })
    }
  }

  return userData
}

/**
 * Desbloqueia usuário (apenas admin)
 */
export async function unlockUser(userId: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  await supabase
    .from('users')
    .update({
      locked_until: null,
      failed_login_attempts: 0,
    })
    .eq('id', userId)
}

/**
 * Gera senha temporária
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Obtém IP do cliente (simplificado)
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return 'unknown'
  }
}

/**
 * Verifica se usuário tem permissão
 */
export function hasPermission(userRole: string, permission: string): boolean {
  // Master tem todas as permissões
  if (userRole === 'master') return true

  const rolePermissions: Record<string, string[]> = {
    admin_municipal: ['manage_users', 'manage_contracts', 'manage_bids', 'view_reports', 'reset_passwords'],
    operacional: ['create_contracts', 'edit_own_contracts', 'attach_documents', 'generate_pdf'],
    consultivo: ['view_contracts', 'download_pdf'],
  }

  return rolePermissions[userRole]?.includes(permission) || false
}
