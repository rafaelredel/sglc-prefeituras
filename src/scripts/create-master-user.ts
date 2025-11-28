/**
 * Script para criar o usuário Super Admin Master
 * Execute este script uma vez para criar o administrador principal do sistema
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createMasterUser() {
  try {
    console.log('🚀 Criando usuário Super Admin Master...')

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'rafaredel@icloud.com',
      password: 'S3iTaw2458',
      email_confirm: true,
      user_metadata: {
        name: 'Super Admin Redel',
        role: 'master',
        is_super_admin: true
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError.message)
      return
    }

    console.log('✅ Usuário criado no Supabase Auth:', authData.user.id)

    // 2. Inserir/atualizar na tabela users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_user_id: authData.user.id,
        name: 'Super Admin Redel',
        email: 'rafaredel@icloud.com',
        role: 'master',
        active: true,
        is_super_admin: true,
        require_password_change: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })

    if (userError) {
      console.error('❌ Erro ao inserir na tabela users:', userError.message)
      return
    }

    console.log('✅ Usuário inserido na tabela users')
    console.log('\n🎉 Super Admin Master criado com sucesso!')
    console.log('\n📧 Email: rafaredel@icloud.com')
    console.log('🔑 Senha: S3iTaw2458')
    console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

createMasterUser()
