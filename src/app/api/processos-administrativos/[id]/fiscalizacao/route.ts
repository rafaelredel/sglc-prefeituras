import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data, error } = await supabase
      .from('processo_fiscalizacao')
      .select('*')
      .eq('processo_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar fiscalizações:', error)
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('Erro ao buscar fiscalizações:', error)
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

    const body = await request.json()

    // Buscar cityhall_id do processo
    const { data: processo, error: processoError } = await supabase
      .from('processos_administrativos')
      .select('cityhall_id')
      .eq('id', params.id)
      .single()

    if (processoError || !processo) {
      return NextResponse.json(
        { success: false, message: 'Processo não encontrado' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('processo_fiscalizacao')
      .insert({
        processo_id: params.id,
        cityhall_id: processo.cityhall_id,
        tipo: body.tipo,
        responsavel_fiscal: body.responsavel_fiscal,
        data_vistoria: body.data_vistoria || null,
        status: body.status || 'Em andamento',
        observacao: body.observacao,
        arquivo_url: body.arquivo_url || null,
        arquivo_nome: body.arquivo_nome || null,
        usuario_id: user.id,
        usuario_nome: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário'
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar fiscalização:', error)
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao criar fiscalização:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
