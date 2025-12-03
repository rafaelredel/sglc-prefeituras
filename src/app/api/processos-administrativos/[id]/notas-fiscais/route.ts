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
      .from('processo_notas_fiscais')
      .select('*')
      .eq('processo_id', params.id)
      .order('data_emissao', { ascending: false })

    if (error) {
      // Se erro for de coluna não encontrada, retornar array vazio
      if (error.message.includes('column') && error.message.includes('schema cache')) {
        console.log('Coluna não encontrada na tabela processo_notas_fiscais - retornando array vazio')
        return NextResponse.json({ success: true, data: [] })
      }
      throw error
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('Erro ao buscar notas fiscais:', error)
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
      .from('processo_notas_fiscais')
      .insert({
        processo_id: params.id,
        numero_nota: body.numero_nota,
        data_emissao: body.data_emissao,
        data_vencimento: body.data_vencimento,
        valor: body.valor,
        fornecedor: body.fornecedor,
        descricao: body.descricao,
        status: body.status || 'pendente',
        nome_arquivo: body.nome_arquivo,
        url_arquivo: body.url_arquivo,
        usuario_id: user.id
      })
      .select()
      .single()

    if (error) {
      // Se erro for de coluna não encontrada, tentar sem os campos de arquivo
      if (error.message.includes('column') && error.message.includes('schema cache')) {
        const { data: dataRetry, error: errorRetry } = await supabase
          .from('processo_notas_fiscais')
          .insert({
            processo_id: params.id,
            numero_nota: body.numero_nota,
            data_emissao: body.data_emissao,
            data_vencimento: body.data_vencimento,
            valor: body.valor,
            fornecedor: body.fornecedor,
            descricao: body.descricao,
            status: body.status || 'pendente',
            usuario_id: user.id
          })
          .select()
          .single()

        if (errorRetry) throw errorRetry

        // Registrar no histórico
        await registrarHistorico({
          processo_id: params.id,
          cityhall_id: usuario.cityhall_id,
          usuario_id: user.id,
          usuario_nome: usuario.nome,
          aba: 'notas_fiscais',
          acao: 'criou',
          descricao: `Cadastrou nota fiscal nº ${body.numero_nota} no valor de R$ ${body.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        })

        return NextResponse.json({ success: true, data: dataRetry })
      }
      throw error
    }

    // Registrar no histórico
    await registrarHistorico({
      processo_id: params.id,
      cityhall_id: usuario.cityhall_id,
      usuario_id: user.id,
      usuario_nome: usuario.nome,
      aba: 'notas_fiscais',
      acao: 'criou',
      descricao: `Cadastrou nota fiscal nº ${body.numero_nota} no valor de R$ ${body.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao criar nota fiscal:', error)
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
    const { nota_id, ...updateData } = body

    // Buscar dados anteriores
    const { data: notaAnterior } = await supabase
      .from('processo_notas_fiscais')
      .select('*')
      .eq('id', nota_id)
      .single()

    if (!notaAnterior) {
      return NextResponse.json(
        { success: false, message: 'Nota fiscal não encontrada' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('processo_notas_fiscais')
      .update(updateData)
      .eq('id', nota_id)
      .select()
      .single()

    if (error) throw error

    // Registrar alterações no histórico
    const alteracoes: string[] = []
    
    if (notaAnterior.valor !== updateData.valor) {
      alteracoes.push(`valor de R$ ${notaAnterior.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${updateData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    }
    
    if (notaAnterior.data_emissao !== updateData.data_emissao) {
      alteracoes.push(`data de emissão de ${new Date(notaAnterior.data_emissao).toLocaleDateString('pt-BR')} para ${new Date(updateData.data_emissao).toLocaleDateString('pt-BR')}`)
    }
    
    if (notaAnterior.status !== updateData.status) {
      alteracoes.push(`status de ${notaAnterior.status} para ${updateData.status}`)
    }

    if (alteracoes.length > 0) {
      await registrarHistorico({
        processo_id: params.id,
        cityhall_id: usuario.cityhall_id,
        usuario_id: user.id,
        usuario_nome: usuario.nome,
        aba: 'notas_fiscais',
        acao: 'alterou',
        descricao: `Alterou nota fiscal nº ${notaAnterior.numero_nota}: ${alteracoes.join(', ')}`
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao atualizar nota fiscal:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const nota_id = searchParams.get('nota_id')

    if (!nota_id) {
      return NextResponse.json(
        { success: false, message: 'ID da nota não fornecido' },
        { status: 400 }
      )
    }

    // Buscar dados da nota antes de deletar
    const { data: nota } = await supabase
      .from('processo_notas_fiscais')
      .select('*')
      .eq('id', nota_id)
      .single()

    if (!nota) {
      return NextResponse.json(
        { success: false, message: 'Nota fiscal não encontrada' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('processo_notas_fiscais')
      .delete()
      .eq('id', nota_id)

    if (error) throw error

    // Registrar no histórico
    await registrarHistorico({
      processo_id: params.id,
      cityhall_id: usuario.cityhall_id,
      usuario_id: user.id,
      usuario_nome: usuario.nome,
      aba: 'notas_fiscais',
      acao: 'deletou',
      descricao: `Deletou nota fiscal nº ${nota.numero_nota} no valor de R$ ${nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar nota fiscal:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
