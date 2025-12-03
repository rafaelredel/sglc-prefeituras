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
 * Busca diretamente de auth.users e valida metadados
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

    if (!authData.user) {
      throw new Error('Erro ao autenticar usuário')
    }

    console.log('✅ Autenticado no Supabase Auth:', authData.user.id)
    console.log('📋 Metadados do usuário:', authData.user.user_metadata)

    // Extrair metadados do usuário
    const metadata = authData.user.user_metadata || {}
    const userRole = metadata.role || 'operacional'
    const userCityhallId = metadata.cityhall_id || null
    const userName = metadata.name || authData.user.email?.split('@')[0] || 'Usuário'

    // Buscar informações complementares da role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('slug, name, level, permissions')
      .eq('slug', userRole)
      .single()

    if (!roleData) {
      throw new Error('Role do usuário não encontrada no sistema')
    }

    // Buscar informações da prefeitura (se houver)
    let cityhallData = null
    if (userCityhallId) {
      const { data: cityhall } = await supabase
        .from('cityhalls')
        .select('id, name, status')
        .eq('id', userCityhallId)
        .single()

      if (cityhall) {
        cityhallData = cityhall
        
        // Verificar se prefeitura está ativa
        if (cityhall.status !== 'active') {
          throw new Error('Prefeitura inativa. Contate o administrador.')
        }
      }
    }

    // Verificar se usuário está ativo (metadado)
    const isActive = metadata.active !== false

    if (!isActive) {
      throw new Error('Usuário inativo. Contate o administrador.')
    }

    // Buscar ou criar registro na tabela users (para compatibilidade com logs)
    let userId = authData.user.id
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (!existingUser) {
      // Criar registro na tabela users para logs
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          name: userName,
          email: authData.user.email,
          cityhall_id: userCityhallId,
          role_id: roleData.id,
          active: true,
          require_password_change: metadata.require_password_change || false,
          last_login: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (newUser) {
        userId = newUser.id
      }
    } else {
      userId = existingUser.id
      
      // Atualizar último acesso
      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          failed_login_attempts: 0,
        })
        .eq('id', userId)
    }

    // Registrar log de login
    try {
      await supabase.from('login_logs').insert({
        user_id: userId,
        success: true,
        ip: await getClientIP(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      })
    } catch (logError) {
      console.warn('Erro ao registrar log de login:', logError)
      // Não falhar o login por causa do log
    }

    // Montar objeto de usuário
    const userData = {
      id: userId,
      auth_user_id: authData.user.id,
      name: userName,
      email: authData.user.email!,
      cityhall_id: userCityhallId,
      active: isActive,
      require_password_change: metadata.require_password_change || false,
      user_roles: roleData,
      cityhalls: cityhallData,
    }

    return {
      user: userData,
      session: authData.session,
    }
  } catch (error) {
    console.error('❌ Erro no login:', error)

    // Registrar tentativa falha
    if (credentials.email) {
      try {
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
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          })
        }
      } catch (logError) {
        console.warn('Erro ao registrar falha de login:', logError)
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
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sglc_user_id')
    localStorage.removeItem('sglc_cityhall_id')
    localStorage.removeItem('sglc_user_role')
    localStorage.removeItem('sglc_user_name')
  }
}

/**
 * Solicita redefinição de senha
 */
export async function requestPasswordReset(email: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  // Enviar e-mail de redefinição
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
  })

  if (error) throw error

  // Registrar log (se usuário existir na tabela users)
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (user) {
      await supabase.from('password_reset_logs').insert({
        user_id: user.id,
        ip: await getClientIP(),
      })
    }
  } catch (logError) {
    console.warn('Erro ao registrar log de reset:', logError)
  }
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

  // Atualizar metadados para remover flag de troca obrigatória
  await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      require_password_change: false,
    }
  })

  // Atualizar flag na tabela users (se existir)
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
    try {
      await supabase.from('password_reset_logs').update({
        reset_time: new Date().toISOString(),
      }).eq('user_id', userData.id).is('reset_time', null)
    } catch (logError) {
      console.warn('Erro ao registrar log de reset:', logError)
    }
  }
}

/**
 * Cria novo usuário (apenas admin)
 * Armazena metadados diretamente em auth.users
 */
export async function createUser(data: CreateUserData) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  // Buscar informações da role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('slug')
    .eq('id', data.role_id)
    .single()

  if (!roleData) {
    throw new Error('Role não encontrada')
  }

  // Criar usuário no Supabase Auth com metadados
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.temporary_password,
    email_confirm: true,
    user_metadata: {
      name: data.name,
      role: roleData.slug,
      cityhall_id: data.cityhall_id,
      personal_email: data.personal_email,
      phone: data.phone,
      position: data.position,
      active: true,
      require_password_change: true,
    }
  })

  if (authError) throw authError

  // Criar registro na tabela users (para compatibilidade com logs)
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
  try {
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
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        })
      }
    }
  } catch (auditError) {
    console.warn('Erro ao registrar auditoria:', auditError)
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
