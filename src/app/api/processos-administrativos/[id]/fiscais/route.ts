import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('processo_fiscais')
      .select('*')
      .eq('processo_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.nome || !body.cargo) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nome e cargo são obrigatórios' 
      }, { status: 400 })
    }

    // Buscar cityhall_id do processo
    const { data: processo } = await supabase
      .from('processos_administrativos')
      .select('cityhall_id')
      .eq('id', params.id)
      .single()

    // Inserir fiscal
    const { data, error } = await supabase
      .from('processo_fiscais')
      .insert({
        processo_id: params.id,
        cityhall_id: processo?.cityhall_id,
        nome: body.nome,
        cargo: body.cargo,
        matricula: body.matricula,
        telefone: body.telefone,
        email: body.email,
        observacoes: body.observacoes,
        tipo_fiscal: body.tipo_fiscal || 'titular',
        usuario_id: user.id,
        usuario_nome: user.user_metadata?.name || user.email
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // Registrar no histórico
    await supabase.from('processo_historico').insert({
      processo_id: params.id,
      cityhall_id: processo?.cityhall_id,
      usuario_id: user.id,
      usuario_nome: user.user_metadata?.name || user.email,
      acao: 'Fiscal cadastrado',
      modulo: 'Fiscais',
      detalhes: { nome: body.nome, cargo: body.cargo, tipo_fiscal: body.tipo_fiscal }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { fiscalId, ...updateData } = body

    if (!fiscalId) {
      return NextResponse.json({ success: false, error: 'ID do fiscal não fornecido' }, { status: 400 })
    }

    // Buscar fiscal atual
    const { data: fiscalAtual } = await supabase
      .from('processo_fiscais')
      .select('*')
      .eq('id', fiscalId)
      .single()

    // Atualizar fiscal
    const { data, error } = await supabase
      .from('processo_fiscais')
      .update(updateData)
      .eq('id', fiscalId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // Registrar no histórico
    await supabase.from('processo_historico').insert({
      processo_id: params.id,
      cityhall_id: fiscalAtual?.cityhall_id,
      usuario_id: user.id,
      usuario_nome: user.user_metadata?.name || user.email,
      acao: 'Fiscal atualizado',
      modulo: 'Fiscais',
      detalhes: { fiscal_id: fiscalId, alteracoes: updateData }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
