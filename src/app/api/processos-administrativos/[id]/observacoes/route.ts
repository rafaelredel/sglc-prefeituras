import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    // Buscar observações com os campos corretos da tabela
    const { data, error } = await supabase
      .from('processo_observacoes')
      .select('id, conteudo, usuario_nome, usuario_email, criado_em')
      .eq('processo_id', params.id)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar observações:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar observações', details: error.message },
        { status: 500 }
      )
    }

    // Formatar resposta
    const observacoes = (data || []).map(obs => ({
      id: obs.id,
      conteudo: obs.conteudo,
      usuario_nome: obs.usuario_nome || 'Usuário',
      created_at: obs.criado_em
    }))

    return NextResponse.json({
      success: true,
      data: observacoes
    })
  } catch (error: any) {
    console.error('Erro na API de observações:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { conteudo } = body

    if (!conteudo || !conteudo.trim()) {
      return NextResponse.json(
        { success: false, message: 'Conteúdo da observação é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar cityhall_id do processo
    const { data: processo, error: processoError } = await supabase
      .from('processos_administrativos')
      .select('cityhall_id')
      .eq('id', params.id)
      .single()

    if (processoError || !processo) {
      console.error('Erro ao buscar processo:', processoError)
      return NextResponse.json(
        { success: false, message: 'Processo não encontrado' },
        { status: 404 }
      )
    }

    // Inserir observação com os campos corretos
    const { data, error } = await supabase
      .from('processo_observacoes')
      .insert({
        processo_id: params.id,
        cityhall_id: processo.cityhall_id,
        usuario_id: user.id,
        usuario_nome: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        usuario_email: user.email || 'sem-email@example.com',
        conteudo: conteudo.trim()
      })
      .select('id, conteudo, usuario_nome, criado_em')
      .single()

    if (error) {
      console.error('Erro ao criar observação:', error)
      
      // Tratamento específico para erro de RLS
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Erro de permissão ao criar observação. Verifique as políticas RLS da tabela processo_observacoes no Supabase.',
            details: error.message 
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { success: false, message: 'Erro ao criar observação', details: error.message },
        { status: 500 }
      )
    }

    const observacao = {
      id: data.id,
      conteudo: data.conteudo,
      usuario_nome: data.usuario_nome,
      created_at: data.criado_em
    }

    return NextResponse.json({
      success: true,
      data: observacao,
      message: 'Observação adicionada com sucesso'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro na API de observações:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}
