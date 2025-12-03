import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { registrarHistorico, gerarDescricaoAlteracao } from '@/lib/historico'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

    // Buscar processo específico
    const { data, error } = await supabase
      .from('processos_administrativos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Erro ao buscar processo:', error)
      return NextResponse.json(
        { success: false, message: 'Processo não encontrado', details: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error('Erro na API de processo:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Buscar dados do usuário
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nome, cityhall_id')
      .eq('id', user.id)
      .single()

    if (!usuario) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Buscar dados anteriores do processo
    const { data: processoAnterior } = await supabase
      .from('processos_administrativos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!processoAnterior) {
      return NextResponse.json(
        { success: false, message: 'Processo não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Atualizar processo
    const { data, error } = await supabase
      .from('processos_administrativos')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar processo:', error)
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    // Registrar alterações no histórico
    const camposAlterados = Object.keys(body).filter(
      campo => processoAnterior[campo] !== body[campo]
    )

    for (const campo of camposAlterados) {
      const descricao = gerarDescricaoAlteracao(
        campo,
        processoAnterior[campo],
        body[campo]
      )

      await registrarHistorico({
        processo_id: params.id,
        cityhall_id: usuario.cityhall_id,
        usuario_id: user.id,
        usuario_nome: usuario.nome,
        aba: 'geral',
        acao: 'alterou',
        campo_alterado: campo,
        valor_anterior: processoAnterior[campo],
        valor_novo: body[campo],
        descricao
      })
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error('Erro na API de processo:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}
