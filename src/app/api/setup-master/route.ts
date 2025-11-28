import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Variáveis de ambiente do Supabase não configuradas' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Verificar/criar role master
    let masterRoleId: string
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('slug', 'master')
      .single()

    if (existingRole) {
      masterRoleId = existingRole.id
    } else {
      // Criar role master se não existir
      const { data: newRole, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          slug: 'master',
          name: 'Administrador Master',
          level: 1,
          permissions: {
            all: true,
            manage_users: true,
            manage_cityhalls: true,
            manage_contracts: true,
            manage_bids: true,
            view_reports: true,
            reset_passwords: true,
            manage_roles: true
          }
        })
        .select('id')
        .single()

      if (roleError) {
        return NextResponse.json(
          { error: 'Erro ao criar role master: ' + roleError.message },
          { status: 400 }
        )
      }

      masterRoleId = newRole.id
    }

    // 2. Verificar se usuário já existe no Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email === 'rafaredel@icloud.com')

    let authUserId: string

    if (existingUser) {
      authUserId = existingUser.id
      
      // Atualizar senha se usuário já existe
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: 'S3iTaw2458',
        email_confirm: true
      })
    } else {
      // Criar novo usuário no Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: 'rafaredel@icloud.com',
        password: 'S3iTaw2458',
        email_confirm: true,
        user_metadata: {
          name: 'Super Admin Redel',
          role: 'master'
        }
      })

      if (authError) {
        return NextResponse.json(
          { error: 'Erro ao criar usuário no Auth: ' + authError.message },
          { status: 400 }
        )
      }

      authUserId = authData.user.id
    }

    // 3. Inserir/atualizar na tabela users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_user_id: authUserId,
        name: 'Super Admin Redel',
        email: 'rafaredel@icloud.com',
        role_id: masterRoleId,
        cityhall_id: null,
        active: true,
        require_password_change: false,
        failed_login_attempts: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'auth_user_id'
      })

    if (userError) {
      return NextResponse.json(
        { error: 'Erro ao inserir na tabela users: ' + userError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Super Admin Master criado/atualizado com sucesso!',
      credentials: {
        email: 'rafaredel@icloud.com',
        password: 'S3iTaw2458'
      },
      warning: 'IMPORTANTE: Você pode fazer login agora!'
    })

  } catch (error) {
    console.error('Erro ao criar master user:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Desconhecido') },
      { status: 500 }
    )
  }
}
