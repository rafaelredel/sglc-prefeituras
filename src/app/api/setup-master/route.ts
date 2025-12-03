import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Tentar múltiplas fontes para as variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        process.env.SUPABASE_URL ||
                        (typeof window !== 'undefined' ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL : undefined)
    
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                               process.env.SUPABASE_SERVICE_KEY

    console.log('🔍 Verificando variáveis:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 20)
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { 
          error: 'Variáveis de ambiente do Supabase não configuradas',
          debug: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey,
            envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
          }
        },
        { status: 500 }
      )
    }

    // Usar Service Role Key para ter permissões de admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Buscar role master existente
    const { data: masterRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id, slug')
      .eq('slug', 'master')
      .single()

    if (roleError || !masterRole) {
      return NextResponse.json(
        { error: 'Role master não encontrada no banco de dados. Execute as migrações primeiro.' },
        { status: 400 }
      )
    }

    const masterRoleId = masterRole.id

    // 2. Verificar se usuário já existe no Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    const existingAuthUser = users?.find(u => u.email === 'rafaredel@icloud.com')

    let authUserId: string

    if (existingAuthUser) {
      authUserId = existingAuthUser.id
      console.log('✅ Usuário já existe no Auth:', authUserId)

      // Atualizar metadados do usuário existente
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        {
          user_metadata: {
            name: 'Super Admin Redel',
            role: 'master',
            cityhall_id: null,
            active: true,
            require_password_change: false,
          }
        }
      )

      if (updateError) {
        console.warn('⚠️ Erro ao atualizar metadados:', updateError)
      } else {
        console.log('✅ Metadados atualizados com sucesso')
      }

      // Atualizar senha se necessário
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        authUserId,
        {
          password: 'S3iTaw2458'
        }
      )

      if (passwordError) {
        console.warn('⚠️ Erro ao atualizar senha:', passwordError)
      }
    } else {
      // Criar novo usuário no Auth com metadados
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'rafaredel@icloud.com',
        password: 'S3iTaw2458',
        email_confirm: true,
        user_metadata: {
          name: 'Super Admin Redel',
          role: 'master',
          cityhall_id: null,
          active: true,
          require_password_change: false,
        }
      })

      if (authError) {
        return NextResponse.json(
          { error: 'Erro ao criar usuário no Auth: ' + authError.message },
          { status: 400 }
        )
      }

      if (!authData.user) {
        return NextResponse.json(
          { error: 'Erro ao criar usuário: dados do usuário não retornados' },
          { status: 400 }
        )
      }

      authUserId = authData.user.id
      console.log('✅ Novo usuário criado no Auth:', authUserId)
    }

    // 3. Verificar se usuário já existe na tabela users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, auth_user_id, email')
      .eq('email', 'rafaredel@icloud.com')
      .single()

    if (existingUser) {
      // Atualizar usuário existente
      const { error: updateError } = await supabase
        .from('users')
        .update({
          auth_user_id: authUserId,
          role_id: masterRoleId,
          active: true,
          require_password_change: false,
          failed_login_attempts: 0,
          locked_until: null,
          name: 'Super Admin Redel'
        })
        .eq('email', 'rafaredel@icloud.com')

      if (updateError) {
        return NextResponse.json(
          { error: 'Erro ao atualizar usuário: ' + updateError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Super Admin Master atualizado com sucesso!',
        credentials: {
          email: 'rafaredel@icloud.com',
          password: 'S3iTaw2458'
        },
        info: {
          userId: existingUser.id,
          authUserId: authUserId,
          roleId: masterRoleId,
          metadata: {
            name: 'Super Admin Redel',
            role: 'master',
            cityhall_id: null,
            active: true
          }
        },
        warning: 'Você pode fazer login agora em /login!'
      })
    }

    // 4. Inserir novo usuário na tabela users
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUserId,
        name: 'Super Admin Redel',
        email: 'rafaredel@icloud.com',
        role_id: masterRoleId,
        cityhall_id: null,
        active: true,
        require_password_change: false,
        failed_login_attempts: 0,
        locked_until: null
      })
      .select()
      .single()

    if (userError) {
      return NextResponse.json(
        { error: 'Erro ao inserir na tabela users: ' + userError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Super Admin Master criado com sucesso!',
      credentials: {
        email: 'rafaredel@icloud.com',
        password: 'S3iTaw2458'
      },
      info: {
        userId: newUser.id,
        authUserId: authUserId,
        roleId: masterRoleId,
        metadata: {
          name: 'Super Admin Redel',
          role: 'master',
          cityhall_id: null,
          active: true
        }
      },
      warning: 'Você pode fazer login agora em /login!'
    })

  } catch (error) {
    console.error('Erro ao criar master user:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Desconhecido') },
      { status: 500 }
    )
  }
}
