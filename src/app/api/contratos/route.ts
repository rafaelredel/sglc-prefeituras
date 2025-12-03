import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface ContratoData {
  prefeitura_id: string
  numero_contrato: string
  processo_administrativo?: string
  modalidade: string
  objeto: string
  valor_total: number
  cnpj_contratada: string
  nome_contratada: string
  responsavel_contratada?: string
  data_assinatura: string
  data_inicio_vigencia: string
  data_fim_vigencia: string
  status_contrato: 'vigente' | 'encerrado' | 'suspenso' | 'cancelado'
  arquivo_pdf?: string
  dotacao_orcamentaria?: string
  fiscal_contrato?: string
  gestor_contrato?: string
  observacoes?: string
}

interface FiltrosContrato {
  numero_contrato?: string
  cnpj_contratada?: string
  nome_contratada?: string
  status_contrato?: string
  data_inicio?: string
  data_fim?: string
  valor_min?: number
  valor_max?: number
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Valida CNPJ (formato básico)
 */
function validarCNPJ(cnpj: string): boolean {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '')
  return cnpjLimpo.length === 14
}

/**
 * Valida campos obrigatórios do contrato
 */
function validarContrato(data: Partial<ContratoData>): { valido: boolean; erros: string[] } {
  const erros: string[] = []

  if (!data.prefeitura_id) erros.push('prefeitura_id é obrigatório')
  if (!data.numero_contrato) erros.push('numero_contrato é obrigatório')
  if (!data.modalidade) erros.push('modalidade é obrigatória')
  if (!data.objeto) erros.push('objeto é obrigatório')
  if (!data.valor_total || data.valor_total <= 0) erros.push('valor_total deve ser maior que zero')
  if (!data.cnpj_contratada) erros.push('cnpj_contratada é obrigatório')
  if (!data.nome_contratada) erros.push('nome_contratada é obrigatório')
  if (!data.data_assinatura) erros.push('data_assinatura é obrigatória')
  if (!data.data_inicio_vigencia) erros.push('data_inicio_vigencia é obrigatória')
  if (!data.data_fim_vigencia) erros.push('data_fim_vigencia é obrigatória')
  if (!data.status_contrato) erros.push('status_contrato é obrigatório')

  // Validar CNPJ
  if (data.cnpj_contratada && !validarCNPJ(data.cnpj_contratada)) {
    erros.push('CNPJ inválido (deve conter 14 dígitos)')
  }

  // Validar datas
  if (data.data_inicio_vigencia && data.data_fim_vigencia) {
    const inicio = new Date(data.data_inicio_vigencia)
    const fim = new Date(data.data_fim_vigencia)
    if (fim < inicio) {
      erros.push('data_fim_vigencia deve ser posterior à data_inicio_vigencia')
    }
  }

  // Validar status
  const statusValidos = ['vigente', 'encerrado', 'suspenso', 'cancelado']
  if (data.status_contrato && !statusValidos.includes(data.status_contrato)) {
    erros.push(`status_contrato deve ser um dos seguintes: ${statusValidos.join(', ')}`)
  }

  return {
    valido: erros.length === 0,
    erros
  }
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
function sanitizarString(str: string | undefined): string | undefined {
  if (!str) return undefined
  return str.trim().replace(/[<>]/g, '')
}

// =====================================================
// GET - LISTAR CONTRATOS COM FILTROS
// =====================================================

export async function GET(request: NextRequest) {
  console.log('📥 [API CONTRATOS] GET - Iniciando listagem de contratos')

  try {
    // Verificar se Supabase está configurado
    if (!supabase) {
      console.error('❌ [API CONTRATOS] Supabase não configurado')
      return NextResponse.json(
        {
          success: false,
          message: 'Banco de dados não configurado',
          details: 'Supabase não está configurado corretamente',
          hint: 'Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
        },
        { status: 500 }
      )
    }

    // Extrair parâmetros de busca
    const { searchParams } = new URL(request.url)
    const prefeituraId = searchParams.get('prefeitura_id')

    if (!prefeituraId) {
      console.error('❌ [API CONTRATOS] prefeitura_id não fornecido')
      return NextResponse.json(
        {
          success: false,
          message: 'prefeitura_id é obrigatório',
          details: 'O ID da prefeitura deve ser fornecido para listar contratos',
          hint: 'Adicione ?prefeitura_id=UUID na URL'
        },
        { status: 400 }
      )
    }

    // Construir query base
    let query = supabase
      .from('contratos')
      .select('*')
      .eq('prefeitura_id', prefeituraId)

    // Aplicar filtros opcionais
    const filtros: FiltrosContrato = {
      numero_contrato: searchParams.get('numero_contrato') || undefined,
      cnpj_contratada: searchParams.get('cnpj_contratada') || undefined,
      nome_contratada: searchParams.get('nome_contratada') || undefined,
      status_contrato: searchParams.get('status_contrato') || undefined,
      data_inicio: searchParams.get('data_inicio') || undefined,
      data_fim: searchParams.get('data_fim') || undefined,
      valor_min: searchParams.get('valor_min') ? parseFloat(searchParams.get('valor_min')!) : undefined,
      valor_max: searchParams.get('valor_max') ? parseFloat(searchParams.get('valor_max')!) : undefined
    }

    console.log('🔍 [API CONTRATOS] Filtros aplicados:', filtros)

    // Aplicar filtros
    if (filtros.numero_contrato) {
      query = query.ilike('numero_contrato', `%${filtros.numero_contrato}%`)
    }
    if (filtros.cnpj_contratada) {
      query = query.ilike('cnpj_contratada', `%${filtros.cnpj_contratada}%`)
    }
    if (filtros.nome_contratada) {
      query = query.ilike('nome_contratada', `%${filtros.nome_contratada}%`)
    }
    if (filtros.status_contrato) {
      query = query.eq('status_contrato', filtros.status_contrato)
    }
    if (filtros.data_inicio) {
      query = query.gte('data_inicio_vigencia', filtros.data_inicio)
    }
    if (filtros.data_fim) {
      query = query.lte('data_fim_vigencia', filtros.data_fim)
    }
    if (filtros.valor_min) {
      query = query.gte('valor_total', filtros.valor_min)
    }
    if (filtros.valor_max) {
      query = query.lte('valor_total', filtros.valor_max)
    }

    // Ordenar por data de assinatura (mais recente primeiro)
    query = query.order('data_assinatura', { ascending: false })

    // Executar query
    const { data, error } = await query

    if (error) {
      console.error('❌ [API CONTRATOS] Erro ao buscar contratos:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Erro ao buscar contratos',
          details: error.message,
          hint: error.hint || 'Verifique se a tabela contratos existe no banco de dados',
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log(`✅ [API CONTRATOS] ${data?.length || 0} contratos encontrados`)

    return NextResponse.json(
      {
        success: true,
        message: 'Contratos listados com sucesso',
        data: data || [],
        total: data?.length || 0
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ [API CONTRATOS] Erro inesperado no GET:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro inesperado ao listar contratos',
        details: error.message || 'Erro desconhecido',
        hint: 'Verifique os logs do servidor para mais detalhes'
      },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - CRIAR NOVO CONTRATO
// =====================================================

export async function POST(request: NextRequest) {
  console.log('📥 [API CONTRATOS] POST - Iniciando criação de contrato')

  try {
    // Verificar se Supabase está configurado
    if (!supabase) {
      console.error('❌ [API CONTRATOS] Supabase não configurado')
      return NextResponse.json(
        {
          success: false,
          message: 'Banco de dados não configurado',
          details: 'Supabase não está configurado corretamente',
          hint: 'Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
        },
        { status: 500 }
      )
    }

    // Ler body da requisição
    let body: Partial<ContratoData>
    try {
      body = await request.json()
      console.log('📦 [API CONTRATOS] Dados recebidos:', {
        ...body,
        cnpj_contratada: body.cnpj_contratada ? '***' : undefined // Ocultar CNPJ no log
      })
    } catch (error) {
      console.error('❌ [API CONTRATOS] Erro ao parsear JSON:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Erro ao processar dados',
          details: 'JSON inválido ou malformado',
          hint: 'Verifique se o corpo da requisição está em formato JSON válido'
        },
        { status: 400 }
      )
    }

    // Validar campos obrigatórios
    const validacao = validarContrato(body)
    if (!validacao.valido) {
      console.error('❌ [API CONTRATOS] Validação falhou:', validacao.erros)
      return NextResponse.json(
        {
          success: false,
          message: 'Dados inválidos',
          details: validacao.erros.join(', '),
          hint: 'Verifique se todos os campos obrigatórios foram preenchidos corretamente',
          errors: validacao.erros
        },
        { status: 400 }
      )
    }

    // Sanitizar strings
    const contratoData: ContratoData = {
      prefeitura_id: body.prefeitura_id!,
      numero_contrato: sanitizarString(body.numero_contrato) || '',
      processo_administrativo: sanitizarString(body.processo_administrativo),
      modalidade: sanitizarString(body.modalidade) || '',
      objeto: sanitizarString(body.objeto) || '',
      valor_total: body.valor_total!,
      cnpj_contratada: body.cnpj_contratada!.replace(/[^\d]/g, ''), // Remover formatação
      nome_contratada: sanitizarString(body.nome_contratada) || '',
      responsavel_contratada: sanitizarString(body.responsavel_contratada),
      data_assinatura: body.data_assinatura!,
      data_inicio_vigencia: body.data_inicio_vigencia!,
      data_fim_vigencia: body.data_fim_vigencia!,
      status_contrato: body.status_contrato!,
      arquivo_pdf: sanitizarString(body.arquivo_pdf),
      dotacao_orcamentaria: sanitizarString(body.dotacao_orcamentaria),
      fiscal_contrato: sanitizarString(body.fiscal_contrato),
      gestor_contrato: sanitizarString(body.gestor_contrato),
      observacoes: sanitizarString(body.observacoes)
    }

    console.log('💾 [API CONTRATOS] Salvando contrato no banco...')

    // Inserir no banco
    const { data, error } = await supabase
      .from('contratos')
      .insert([contratoData])
      .select()
      .single()

    if (error) {
      console.error('❌ [API CONTRATOS] Erro ao salvar no banco:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Erro ao criar contrato no banco de dados',
          details: error.message,
          hint: error.hint || 'Verifique se a tabela contratos existe e se todos os campos estão corretos',
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log('✅ [API CONTRATOS] Contrato criado com sucesso:', data.id)

    return NextResponse.json(
      {
        success: true,
        message: 'Contrato criado com sucesso',
        id: data.id,
        data: data
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ [API CONTRATOS] Erro inesperado no POST:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro inesperado ao criar contrato',
        details: error.message || 'Erro desconhecido',
        hint: 'Verifique os logs do servidor para mais detalhes'
      },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - ATUALIZAR CONTRATO
// =====================================================

export async function PUT(request: NextRequest) {
  console.log('📥 [API CONTRATOS] PUT - Iniciando atualização de contrato')

  try {
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          message: 'Banco de dados não configurado',
          details: 'Supabase não está configurado corretamente'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { id, prefeitura_id, ...updateData } = body

    if (!id || !prefeitura_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID do contrato e prefeitura_id são obrigatórios',
          hint: 'Forneça o ID do contrato e o prefeitura_id para atualização'
        },
        { status: 400 }
      )
    }

    // Atualizar apenas se pertencer à mesma prefeitura (segurança)
    const { data, error } = await supabase
      .from('contratos')
      .update(updateData)
      .eq('id', id)
      .eq('prefeitura_id', prefeitura_id)
      .select()
      .single()

    if (error) {
      console.error('❌ [API CONTRATOS] Erro ao atualizar:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Erro ao atualizar contrato',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Contrato não encontrado ou sem permissão',
          hint: 'Verifique se o ID está correto e se o contrato pertence à sua prefeitura'
        },
        { status: 404 }
      )
    }

    console.log('✅ [API CONTRATOS] Contrato atualizado:', data.id)

    return NextResponse.json(
      {
        success: true,
        message: 'Contrato atualizado com sucesso',
        data: data
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ [API CONTRATOS] Erro inesperado no PUT:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro inesperado ao atualizar contrato',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// =====================================================
// DELETE - EXCLUIR CONTRATO
// =====================================================

export async function DELETE(request: NextRequest) {
  console.log('📥 [API CONTRATOS] DELETE - Iniciando exclusão de contrato')

  try {
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          message: 'Banco de dados não configurado'
        },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const prefeituraId = searchParams.get('prefeitura_id')

    if (!id || !prefeituraId) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID do contrato e prefeitura_id são obrigatórios'
        },
        { status: 400 }
      )
    }

    // Excluir apenas se pertencer à mesma prefeitura (segurança)
    const { error } = await supabase
      .from('contratos')
      .delete()
      .eq('id', id)
      .eq('prefeitura_id', prefeituraId)

    if (error) {
      console.error('❌ [API CONTRATOS] Erro ao excluir:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Erro ao excluir contrato',
          details: error.message
        },
        { status: 500 }
      )
    }

    console.log('✅ [API CONTRATOS] Contrato excluído:', id)

    return NextResponse.json(
      {
        success: true,
        message: 'Contrato excluído com sucesso'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ [API CONTRATOS] Erro inesperado no DELETE:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro inesperado ao excluir contrato',
        details: error.message
      },
      { status: 500 }
    )
  }
}
