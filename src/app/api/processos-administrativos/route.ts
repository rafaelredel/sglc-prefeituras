import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Obtém ou cria uma prefeitura padrão para o usuário
 * Garante que todo usuário tenha um cityhall_id válido
 */
async function obterOuCriarPrefeitura(supabase: any, userId: string): Promise<string> {
  try {
    // 1. Verificar se usuário já tem cityhall_id na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('cityhall_id')
      .eq('id', userId)
      .single()

    // Se usuário tem cityhall_id válido, retornar
    if (!userError && userData?.cityhall_id) {
      console.log('✅ Usuário já tem cityhall_id:', userData.cityhall_id)
      return userData.cityhall_id
    }

    console.log('⚠️ Usuário sem cityhall_id, criando prefeitura padrão...')

    // 2. Buscar prefeitura padrão existente
    const { data: prefeituraExistente, error: prefeituraError } = await supabase
      .from('cityhalls')
      .select('id')
      .eq('nome', 'Prefeitura Padrão')
      .single()

    let cityhallId: string

    if (!prefeituraError && prefeituraExistente) {
      // Prefeitura padrão já existe
      cityhallId = prefeituraExistente.id
      console.log('✅ Usando prefeitura padrão existente:', cityhallId)
    } else {
      // 3. Criar nova prefeitura padrão (APENAS com colunas que existem no schema)
      const { data: novaPrefeitura, error: criarError } = await supabase
        .from('cityhalls')
        .insert([{
          nome: 'Prefeitura Padrão',
          cnpj: '00000000000000'
        }])
        .select()
        .single()

      if (criarError) {
        console.error('❌ Erro ao criar prefeitura padrão:', criarError)
        throw new Error(`Erro ao criar prefeitura padrão: ${criarError.message}`)
      }

      cityhallId = novaPrefeitura.id
      console.log('✅ Prefeitura padrão criada:', cityhallId)
    }

    // 4. Associar usuário à prefeitura
    const { error: updateError } = await supabase
      .from('users')
      .update({ cityhall_id: cityhallId })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Erro ao associar usuário à prefeitura:', updateError)
      // Não falhar aqui - retornar o cityhallId mesmo assim
    } else {
      console.log('✅ Usuário associado à prefeitura:', cityhallId)
    }

    return cityhallId
  } catch (error: any) {
    console.error('❌ Erro em obterOuCriarPrefeitura:', error)
    throw new Error(`Erro ao obter/criar prefeitura: ${error.message}`)
  }
}

/**
 * Gera o próximo número de processo automaticamente
 * Formato: [Prefixo]-[Ano]-[Mês]-[Sequencial de 5 dígitos]
 * Exemplo: CTR-2025-12-00001 ou LIC-2025-12-00001
 */
async function gerarNumeroProcesso(supabase: any, tipo: 'licitacao' | 'contrato'): Promise<string> {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  
  // Definir prefixo baseado no tipo
  const prefixo = tipo === 'contrato' ? 'CTR' : 'LIC'
  
  // Buscar o maior sequencial existente para este prefixo, ano e mês
  const padraoInicio = `${prefixo}-${ano}-${mes}-`
  
  const { data, error } = await supabase
    .from('processos_administrativos')
    .select('numero_processo')
    .like('numero_processo', `${padraoInicio}%`)
    .order('numero_processo', { ascending: false })
    .limit(1)
  
  let proximoSequencial = 1
  
  if (data && data.length > 0) {
    // Extrair o sequencial do último número
    const ultimoNumero = data[0].numero_processo
    const partes = ultimoNumero.split('-')
    if (partes.length === 4) {
      const ultimoSequencial = parseInt(partes[3], 10)
      if (!isNaN(ultimoSequencial)) {
        proximoSequencial = ultimoSequencial + 1
      }
    }
  }
  
  // Formatar sequencial com 5 dígitos
  const sequencialFormatado = String(proximoSequencial).padStart(5, '0')
  
  // Retornar número completo
  return `${prefixo}-${ano}-${mes}-${sequencialFormatado}`
}

/**
 * Adiciona headers CORS para todas as respostas
 */
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

/**
 * Handler para requisições OPTIONS (preflight CORS)
 */
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({ success: true }, { status: 200 })
  return addCorsHeaders(response)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      const response = NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      )
      return addCorsHeaders(response)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      const response = NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
      return addCorsHeaders(response)
    }

    // Buscar todos os processos administrativos (usando created_at)
    const { data, error } = await supabase
      .from('processos_administrativos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar processos:', error)
      const response = NextResponse.json(
        { success: false, message: 'Erro ao buscar processos', details: error.message },
        { status: 500 }
      )
      return addCorsHeaders(response)
    }

    const response = NextResponse.json({
      success: true,
      data: data || []
    })
    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Erro na API de processos:', error)
    const response = NextResponse.json(
      { success: false, message: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      const response = NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      )
      return addCorsHeaders(response)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      const response = NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
      return addCorsHeaders(response)
    }

    // Obter dados do corpo da requisição
    const body = await request.json()

    // Validar campo tipo obrigatório
    if (!body.tipo) {
      const response = NextResponse.json(
        { success: false, message: 'Campo "tipo" é obrigatório' },
        { status: 400 }
      )
      return addCorsHeaders(response)
    }

    // GARANTIR que o usuário tenha um cityhall_id válido
    let cityhallId: string
    
    try {
      cityhallId = await obterOuCriarPrefeitura(supabase, user.id)
      console.log('✅ cityhall_id obtido/criado:', cityhallId)
    } catch (error: any) {
      console.error('❌ Erro ao obter/criar prefeitura:', error)
      const response = NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao configurar prefeitura do usuário',
          details: error.message 
        },
        { status: 500 }
      )
      return addCorsHeaders(response)
    }

    // Gerar número do processo automaticamente
    const numeroProcesso = await gerarNumeroProcesso(supabase, body.tipo)

    // Inserir novo processo (usando created_at que será gerado automaticamente pelo banco)
    const { data, error } = await supabase
      .from('processos_administrativos')
      .insert([{
        ...body,
        numero_processo: numeroProcesso,
        cityhall_id: cityhallId,
        criado_por: user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Erro ao criar processo:', error)
      const response = NextResponse.json(
        { success: false, message: 'Erro ao criar processo', details: error.message },
        { status: 500 }
      )
      return addCorsHeaders(response)
    }

    console.log('✅ Processo criado com sucesso:', data)

    const response = NextResponse.json({
      success: true,
      data: data,
      message: `Processo criado com sucesso! Número: ${numeroProcesso}`
    }, { status: 201 })
    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('❌ Erro na API de processos (POST):', error)
    const response = NextResponse.json(
      { success: false, message: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
    return addCorsHeaders(response)
  }
}
