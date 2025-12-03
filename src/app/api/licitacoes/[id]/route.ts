import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/licitacoes/[id]
 * Busca licitação específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }

    const { id } = params

    // Obter usuário autenticado
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Buscar licitação
    const { data: licitacao, error } = await supabase
      .from('licitacoes')
      .select(`
        *,
        cityhalls(name)
      `)
      .eq('id', id)
      .single()

    if (error || !licitacao) {
      return NextResponse.json(
        { error: 'Licitação não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(licitacao)

  } catch (error) {
    console.error('Erro ao buscar licitação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/licitacoes/[id]
 * Atualiza licitação
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      )
    }

    const { id } = params

    // Obter usuário autenticado
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('id, cityhall_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Atualizar licitação
    const { data: licitacao, error: updateError } = await supabase
      .from('licitacoes')
      .update({
        ...body,
        atualizado_por: userData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar licitação:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar licitação' },
        { status: 500 }
      )
    }

    // Registrar no histórico
    await supabase.from('historico_licitacao').insert({
      licitacao_id: id,
      user_id: userData.id,
      acao: 'atualizacao',
      descricao: 'Licitação atualizada',
      cityhall_id: userData.cityhall_id,
    })

    // Registrar auditoria
    await supabase.from('audit_logs').insert({
      user_id: userData.id,
      cityhall_id: userData.cityhall_id,
      action: 'update_licitacao',
      entity_type: 'licitacao',
      entity_id: id,
      details: body,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(licitacao)

  } catch (error) {
    console.error('Erro ao atualizar licitação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
