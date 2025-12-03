import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { registrarHistorico } from '@/lib/historico'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data, error } = await supabase
      .from('processo_financeiro')
      .select('*')
      .eq('processo_id', params.id)
      .order('data', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('Erro ao buscar movimentações financeiras:', error)
    return NextResponse.json(
      { success: false, message: error.message },
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

    const body = await request.json()

    const { data, error } = await supabase
      .from('processo_financeiro')
      .insert({
        processo_id: params.id,
        tipo: body.tipo,
        valor: body.valor,
        data: body.data,
        descricao: body.descricao,
        responsavel: body.responsavel,
        usuario_id: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Registrar no histórico
    await registrarHistorico({
      processo_id: params.id,
      cityhall_id: usuario.cityhall_id,
      usuario_id: user.id,
      usuario_nome: usuario.nome,
      aba: 'financeiro',
      acao: 'criou',
      descricao: `Adicionou movimentação financeira: ${body.tipo} de R$ ${body.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao criar movimentação financeira:', error)
    return NextResponse.json(
      { success: false, message: error.message },
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

    const body = await request.json()
    const { financeiro_id, ...updateData } = body

    // Buscar dados anteriores
    const { data: financeiroAnterior } = await supabase
      .from('processo_financeiro')
      .select('*')
      .eq('id', financeiro_id)
      .single()

    if (!financeiroAnterior) {
      return NextResponse.json(
        { success: false, message: 'Movimentação não encontrada' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('processo_financeiro')
      .update(updateData)
      .eq('id', financeiro_id)
      .select()
      .single()

    if (error) throw error

    // Registrar alterações no histórico
    const alteracoes: string[] = []
    
    if (financeiroAnterior.valor !== updateData.valor) {
      alteracoes.push(`valor de R$ ${financeiroAnterior.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${updateData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    }
    
    if (financeiroAnterior.data !== updateData.data) {
      alteracoes.push(`data de ${new Date(financeiroAnterior.data).toLocaleDateString('pt-BR')} para ${new Date(updateData.data).toLocaleDateString('pt-BR')}`)
    }
    
    if (financeiroAnterior.tipo !== updateData.tipo) {
      alteracoes.push(`tipo de ${financeiroAnterior.tipo} para ${updateData.tipo}`)
    }

    if (alteracoes.length > 0) {
      await registrarHistorico({
        processo_id: params.id,
        cityhall_id: usuario.cityhall_id,
        usuario_id: user.id,
        usuario_nome: usuario.nome,
        aba: 'financeiro',
        acao: 'alterou',
        descricao: `Alterou movimentação financeira: ${alteracoes.join(', ')}`
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao atualizar movimentação financeira:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
