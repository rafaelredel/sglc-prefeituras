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
    
    const { data, error } = await supabase
      .from('processo_documentos')
      .select('*')
      .eq('processo_id', params.id)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar documentos:', error)
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('Erro ao buscar documentos:', error)
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
      console.error('Erro ao buscar processo:', processoError)
      return NextResponse.json(
        { success: false, message: 'Processo não encontrado' },
        { status: 404 }
      )
    }

    // Inserir documento com os campos corretos da tabela
    const { data, error } = await supabase
      .from('processo_documentos')
      .insert({
        processo_id: params.id,
        cityhall_id: processo.cityhall_id,
        tipo_documento: body.tipo || 'geral',
        nome_arquivo: body.arquivo_nome,
        tipo_arquivo: body.arquivo_mime_type || 'application/octet-stream',
        tamanho_bytes: body.arquivo_tamanho || 0,
        url_arquivo: body.arquivo_url,
        observacao: body.descricao || '',
        usuario_id: user.id,
        usuario_nome: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário'
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar documento:', error)
      
      // Tratamento específico para erro de RLS
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Erro de permissão ao criar documento. Verifique as políticas RLS da tabela processo_documentos no Supabase.',
            details: error.message 
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao criar documento:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
