import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/licitacoes
 * Lista licitações com filtros
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: true, message: 'Supabase não configurado' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Obter usuário autenticado
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: true, message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: true, message: 'Token inválido' },
        { status: 401 }
      )
    }

    // Obter metadados do usuário
    let cityhallId = user.user_metadata?.cityhall_id
    const userRole = user.user_metadata?.role

    // Se não tiver cityhall_id, tentar buscar uma prefeitura ativa e vincular
    if (!cityhallId) {
      console.log('⚠️ Usuário sem cityhall_id, buscando prefeitura ativa...')
      
      const { data: cityhalls, error: cityhallError } = await supabase
        .from('cityhalls')
        .select('id, name')
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!cityhallError && cityhalls) {
        cityhallId = cityhalls.id
        console.log(`✅ Prefeitura encontrada: ${cityhalls.name} (${cityhallId})`)
        
        // Atualizar metadados do usuário
        try {
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              cityhall_id: cityhallId,
              cityhall_name: cityhalls.name
            }
          })
          console.log('✅ Metadados do usuário atualizados')
        } catch (updateError) {
          console.warn('⚠️ Não foi possível atualizar metadados (não crítico):', updateError)
        }
      } else {
        console.error('❌ Nenhuma prefeitura ativa encontrada')
        return NextResponse.json(
          { 
            error: true, 
            message: 'Nenhuma prefeitura ativa encontrada no sistema. Entre em contato com o administrador.',
            hint: 'É necessário ter pelo menos uma prefeitura cadastrada e ativa.'
          },
          { status: 403 }
        )
      }
    }

    // Construir query base
    let query = supabase
      .from('licitacoes')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtro por prefeitura (multi-tenant)
    // Super admin (master) vê tudo, outros veem apenas da sua prefeitura
    if (userRole !== 'master' && cityhallId) {
      query = query.eq('cityhall_id', cityhallId)
    }

    // Filtros opcionais
    const search = searchParams.get('search')
    if (search) {
      query = query.or(`numero_protocolo.ilike.%${search}%,objeto.ilike.%${search}%,responsavel.ilike.%${search}%`)
    }

    const modalidade = searchParams.get('modalidade')
    if (modalidade) {
      query = query.eq('modalidade', modalidade)
    }

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const secretaria = searchParams.get('secretaria')
    if (secretaria) {
      query = query.ilike('secretaria', `%${secretaria}%`)
    }

    const dataInicio = searchParams.get('data_inicio')
    if (dataInicio) {
      query = query.gte('data_abertura', dataInicio)
    }

    const dataFim = searchParams.get('data_fim')
    if (dataFim) {
      query = query.lte('data_abertura', dataFim)
    }

    const valorMin = searchParams.get('valor_min')
    if (valorMin) {
      query = query.gte('valor_estimado', parseFloat(valorMin))
    }

    const valorMax = searchParams.get('valor_max')
    if (valorMax) {
      query = query.lte('valor_estimado', parseFloat(valorMax))
    }

    // Paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao buscar licitações:', error)
      return NextResponse.json(
        { error: true, message: 'Erro ao buscar licitações', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Erro na API de licitações:', error)
    return NextResponse.json(
      { error: true, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/licitacoes
 * Cria nova licitação
 */
export async function POST(request: NextRequest) {
  console.log('═══════════════════════════════════════════════════════')
  console.log('🚀 POST /api/licitacoes - INICIANDO CRIAÇÃO DE LICITAÇÃO')
  console.log('═══════════════════════════════════════════════════════')

  try {
    // VERIFICAÇÃO 1: Supabase configurado
    if (!supabase) {
      console.error('❌ ERRO CRÍTICO: Supabase não configurado')
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Supabase não configurado',
        details: 'As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas.',
        hint: 'Configure as variáveis de ambiente no arquivo .env.local'
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 500 })
    }
    console.log('✅ Supabase configurado')

    // VERIFICAÇÃO 2: Header de autorização
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ ERRO: Header de autorização ausente')
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Não autorizado',
        details: 'Header de autorização ausente na requisição',
        hint: 'Faça login novamente'
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 401 })
    }
    console.log('✅ Header de autorização presente')

    // VERIFICAÇÃO 3: Autenticação do usuário
    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Validando token...')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError) {
      console.error('❌ ERRO DE AUTENTICAÇÃO:', authError)
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Erro de autenticação', 
        details: authError.message,
        hint: 'Token inválido ou expirado. Faça login novamente.'
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 401 })
    }

    if (!user) {
      console.error('❌ ERRO: Usuário não encontrado')
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Usuário não encontrado',
        details: 'Token válido mas usuário não existe no sistema',
        hint: 'Entre em contato com o administrador'
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 401 })
    }

    console.log('✅ Usuário autenticado:', user.email)
    console.log('👤 User ID:', user.id)

    // VERIFICAÇÃO 4: Metadados do usuário e vinculação de prefeitura
    let cityhallId = user.user_metadata?.cityhall_id
    const userId = user.id

    console.log('🏛️ Cityhall ID inicial:', cityhallId)
    console.log('👤 User metadata:', JSON.stringify(user.user_metadata, null, 2))

    // Se não tiver cityhall_id, tentar buscar uma prefeitura ativa e vincular
    if (!cityhallId) {
      console.log('⚠️ Usuário sem cityhall_id, buscando prefeitura ativa...')
      
      const { data: cityhalls, error: cityhallError } = await supabase
        .from('cityhalls')
        .select('id, name')
        .eq('status', 'active')
        .limit(1)
        .single()

      if (cityhallError) {
        console.error('❌ ERRO ao buscar prefeitura:', cityhallError)
        const errorResponse = { 
          success: false,
          error: true, 
          message: 'Nenhuma prefeitura ativa encontrada no sistema',
          details: cityhallError.message,
          hint: 'Entre em contato com o administrador para cadastrar uma prefeitura com status "active".'
        }
        console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
        return NextResponse.json(errorResponse, { status: 403 })
      }

      if (!cityhalls) {
        console.error('❌ ERRO: Nenhuma prefeitura encontrada')
        const errorResponse = { 
          success: false,
          error: true, 
          message: 'Nenhuma prefeitura cadastrada no sistema',
          details: 'Não há prefeituras ativas no banco de dados',
          hint: 'Entre em contato com o administrador para cadastrar uma prefeitura.'
        }
        console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
        return NextResponse.json(errorResponse, { status: 403 })
      }

      cityhallId = cityhalls.id
      console.log(`✅ Prefeitura encontrada e vinculada: ${cityhalls.name} (${cityhallId})`)
      
      // Tentar atualizar metadados do usuário (não crítico)
      try {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            cityhall_id: cityhallId,
            cityhall_name: cityhalls.name
          }
        })
        console.log('✅ Metadados do usuário atualizados')
      } catch (updateError) {
        console.warn('⚠️ Não foi possível atualizar metadados (não crítico):', updateError)
      }
    }

    console.log('✅ Prefeitura vinculada:', cityhallId)

    // VERIFICAÇÃO 5: Ler body da requisição
    console.log('📦 Lendo body da requisição...')
    let body
    try {
      body = await request.json()
      console.log('✅ Body parseado com sucesso')
      console.log('📄 Dados recebidos:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('❌ ERRO ao parsear JSON do body:', parseError)
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'JSON inválido no body da requisição',
        details: parseError instanceof Error ? parseError.message : 'Erro ao parsear JSON',
        hint: 'Verifique se os dados estão no formato JSON válido'
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // VERIFICAÇÃO 6: Validar campos obrigatórios
    console.log('🔍 Validando campos obrigatórios...')
    const requiredFields = [
      'modalidade',
      'objeto',
      'secretaria',
      'data_abertura',
      'responsavel'
    ]

    const missingFields: string[] = []
    for (const field of requiredFields) {
      if (!body[field]) {
        missingFields.push(field)
      }
    }

    if (missingFields.length > 0) {
      console.error(`❌ ERRO: Campos obrigatórios ausentes: ${missingFields.join(', ')}`)
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Campos obrigatórios ausentes',
        details: `Os seguintes campos são obrigatórios: ${missingFields.join(', ')}`,
        hint: 'Preencha todos os campos obrigatórios e tente novamente',
        missingFields
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 400 })
    }

    console.log('✅ Todos os campos obrigatórios presentes')

    // VERIFICAÇÃO 7: Validar modalidade
    const modalidadesValidas = [
      'pregao_eletronico',
      'pregao_presencial',
      'concorrencia',
      'tomada_precos',
      'dispensa',
      'inexigibilidade',
      'rdc',
      'dialogo_competitivo'
    ]

    if (!modalidadesValidas.includes(body.modalidade)) {
      console.error('❌ ERRO: Modalidade inválida:', body.modalidade)
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Modalidade inválida',
        details: `A modalidade "${body.modalidade}" não é válida`,
        hint: `Modalidades válidas: ${modalidadesValidas.join(', ')}`,
        validModalidades: modalidadesValidas
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 400 })
    }

    console.log('✅ Modalidade válida:', body.modalidade)

    // VERIFICAÇÃO 8: Gerar número de protocolo
    console.log('🔢 Gerando número de protocolo...')
    let numeroProtocolo
    try {
      numeroProtocolo = await gerarNumeroProtocolo(cityhallId)
      console.log('✅ Número de protocolo gerado:', numeroProtocolo)
    } catch (protocolError) {
      console.error('❌ ERRO ao gerar número de protocolo:', protocolError)
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Erro ao gerar número de protocolo', 
        details: protocolError instanceof Error ? protocolError.message : String(protocolError),
        hint: 'Erro interno ao gerar número sequencial. Tente novamente.'
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // VERIFICAÇÃO 9: Preparar dados para inserção
    console.log('📝 Preparando dados para inserção...')
    const licitacaoData = {
      numero_protocolo: numeroProtocolo,
      modalidade: body.modalidade,
      objeto: body.objeto.trim(),
      secretaria: body.secretaria.trim(),
      data_abertura: body.data_abertura,
      data_encerramento_prevista: body.data_encerramento_prevista || null,
      valor_estimado: body.valor_estimado || null,
      fonte_recursos: body.fonte_recursos?.trim() || null,
      responsavel: body.responsavel.trim(),
      status: body.status || 'em_aberto',
      observacoes: body.observacoes?.trim() || null,
      cityhall_id: cityhallId,
      criado_por: userId,
    }

    console.log('✅ Dados preparados para inserção:')
    console.log(JSON.stringify(licitacaoData, null, 2))

    // VERIFICAÇÃO 10: Inserir no banco de dados
    console.log('💾 Inserindo no banco de dados...')
    console.log('📍 Tabela: licitacoes')
    
    const { data: licitacao, error: insertError } = await supabase
      .from('licitacoes')
      .insert(licitacaoData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ ERRO AO INSERIR NO BANCO:', insertError)
      console.error('📋 Detalhes do erro:', JSON.stringify(insertError, null, 2))
      
      // Verificar se é erro de coluna não encontrada
      if (insertError.code === 'PGRST204' || insertError.message?.includes('column')) {
        const errorResponse = { 
          success: false,
          error: true, 
          message: '⚠️ BANCO DE DADOS PRECISA SER ATUALIZADO',
          details: insertError.message,
          hint: 'Execute o script SQL em database/fix-licitacoes-columns.sql no Supabase Dashboard para adicionar as colunas necessárias.',
          code: insertError.code,
          sqlScriptPath: 'database/fix-licitacoes-columns.sql',
          instructions: [
            '1. Acesse o Supabase Dashboard',
            '2. Vá em "SQL Editor"',
            '3. Abra o arquivo database/fix-licitacoes-columns.sql',
            '4. Cole o conteúdo no editor',
            '5. Clique em "Run" para executar',
            '6. Tente criar a licitação novamente'
          ]
        }
        console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
        return NextResponse.json(errorResponse, { status: 500 })
      }
      
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Erro ao criar licitação no banco de dados', 
        details: insertError.message,
        hint: insertError.hint || 'Erro ao inserir dados no banco',
        code: insertError.code
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 500 })
    }

    if (!licitacao) {
      console.error('❌ ERRO: Licitação não foi retornada após inserção')
      const errorResponse = { 
        success: false,
        error: true, 
        message: 'Licitação criada mas não retornada pelo banco',
        details: 'O banco não retornou os dados da licitação criada',
        hint: 'Verifique se a licitação foi criada consultando a lista'
      }
      console.log('📤 Retornando erro:', JSON.stringify(errorResponse))
      return NextResponse.json(errorResponse, { status: 500 })
    }

    console.log('✅ LICITAÇÃO CRIADA COM SUCESSO!')
    console.log('📄 Dados da licitação criada:', JSON.stringify(licitacao, null, 2))

    // VERIFICAÇÃO 11: Registrar no histórico (não crítico)
    console.log('📚 Registrando no histórico...')
    try {
      await supabase.from('historico_licitacao').insert({
        licitacao_id: licitacao.id,
        user_id: userId,
        acao: 'criacao',
        descricao: `Licitação ${numeroProtocolo} criada`,
        cityhall_id: cityhallId,
      })
      console.log('✅ Histórico registrado')
    } catch (histError) {
      console.warn('⚠️ Erro ao registrar histórico (não crítico):', histError)
    }

    // VERIFICAÇÃO 12: Registrar auditoria (não crítico)
    console.log('📋 Registrando auditoria...')
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        cityhall_id: cityhallId,
        action: 'create_licitacao',
        entity_type: 'licitacao',
        entity_id: licitacao.id,
        details: { numero_protocolo: numeroProtocolo, objeto: body.objeto },
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })
      console.log('✅ Auditoria registrada')
    } catch (auditError) {
      console.warn('⚠️ Erro ao registrar auditoria (não crítico):', auditError)
    }

    // RESPOSTA FINAL DE SUCESSO
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ SUCESSO TOTAL - RETORNANDO RESPOSTA')
    console.log('═══════════════════════════════════════════════════════')

    const successResponse = {
      success: true,
      id: licitacao.id,
      message: 'Licitação criada com sucesso',
      data: licitacao
    }

    console.log('📤 Resposta de sucesso:', JSON.stringify(successResponse, null, 2))

    return NextResponse.json(successResponse, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ ERRO CRÍTICO NÃO TRATADO')
    console.error('═══════════════════════════════════════════════════════')
    console.error('Erro:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
    
    const errorResponse = { 
      success: false,
      error: true, 
      message: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      hint: 'Erro inesperado no servidor. Entre em contato com o suporte.',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }
    console.log('📤 Retornando erro crítico:', JSON.stringify(errorResponse))
    
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}

/**
 * Gera número de protocolo único
 * Formato: AAAA-MM-NNNNN
 */
async function gerarNumeroProtocolo(cityhallId: string): Promise<string> {
  console.log('🔢 Gerando número de protocolo para cityhall:', cityhallId)
  
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')

  console.log(`📅 Ano: ${ano}, Mês: ${mes}`)

  // Buscar total de licitações do ano/mês atual
  const inicioMes = `${ano}-${mes}-01`
  const proximoMes = mes === '12' 
    ? `${ano + 1}-01-01` 
    : `${ano}-${String(parseInt(mes) + 1).padStart(2, '0')}-01`

  console.log(`🔍 Buscando licitações entre ${inicioMes} e ${proximoMes}`)

  const { count, error } = await supabase!
    .from('licitacoes')
    .select('*', { count: 'exact', head: true })
    .eq('cityhall_id', cityhallId)
    .gte('created_at', inicioMes)
    .lt('created_at', proximoMes)

  if (error) {
    console.error('❌ Erro ao contar licitações:', error)
    throw new Error(`Erro ao contar licitações: ${error.message}`)
  }

  console.log(`📊 Total de licitações no mês: ${count || 0}`)

  const numero = String((count || 0) + 1).padStart(5, '0')
  const protocolo = `${ano}-${mes}-${numero}`

  console.log(`✅ Protocolo gerado: ${protocolo}`)

  return protocolo
}
