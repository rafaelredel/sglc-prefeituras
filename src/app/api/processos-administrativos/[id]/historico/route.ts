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
    
    // Verificar se a tabela existe antes de consultar
    const { data: tableExists } = await supabase
      .from('processo_historico')
      .select('id')
      .limit(1)
      .maybeSingle()

    // Se a tabela não existir ou não houver dados, retornar array vazio
    if (!tableExists) {
      console.log('Tabela processo_historico não existe ou está vazia - retornando array vazio')
      return NextResponse.json({ success: true, data: [] })
    }

    const { data, error } = await supabase
      .from('processo_historico')
      .select('*')
      .eq('processo_id', params.id)
      .order('criado_em', { ascending: false })

    if (error) {
      // Se erro for de tabela não encontrada, retornar array vazio
      if (error.message.includes('not found') || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('Tabela processo_historico não encontrada - retornando array vazio')
        return NextResponse.json({ success: true, data: [] })
      }

      console.error('Erro ao buscar histórico:', error)
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    // Se erro for de tabela não encontrada, retornar array vazio
    if (error.message?.includes('not found') || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.log('Tabela processo_historico não encontrada - retornando array vazio')
      return NextResponse.json({ success: true, data: [] })
    }

    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
