import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      global: {
        fetch: async (url, options = {}) => {
          const maxRetries = 3
          let lastError: Error | null = null

          for (let i = 0; i < maxRetries; i++) {
            try {
              const response = await fetch(url, options)
              return response
            } catch (error: any) {
              lastError = error
              if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
              }
            }
          }

          throw lastError || new Error('Falha na requisição após múltiplas tentativas')
        }
      }
    })
  : null

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabase)
}

export async function getSession() {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Erro ao obter sessão:', error)
      throw error
    }

    if (!session) {
      throw new Error('Sessão não encontrada. Faça login novamente.')
    }

    return session
  } catch (error: any) {
    console.error('Erro ao obter sessão:', error)
    throw error
  }
}

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  if (!supabase) {
    throw new Error('Supabase não configurado')
  }

  let response: Response | null = null

  try {
    const session = await getSession()
    
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${session.access_token}`)
    
    // Só define Content-Type se não for FormData (upload de arquivos)
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    response = await fetch(url, {
      ...options,
      headers
    })

    // Capturar informações da resposta antes de qualquer processamento
    const responseInfo = {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    }

    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (!response.ok) {
      let errorData: any = null
      let errorMessage = ''
      
      // Tentar extrair dados de erro do corpo da resposta
      try {
        const responseText = await response.text()
        
        // Se resposta está vazia
        if (!responseText || responseText.trim() === '') {
          errorMessage = `Erro ${response.status}: ${response.statusText || 'Resposta vazia do servidor'}`
          errorData = { 
            message: errorMessage,
            isEmpty: true 
          }
        } else {
          // Tentar parsear como JSON
          if (isJson) {
            try {
              errorData = JSON.parse(responseText)
            } catch (jsonError) {
              // Se falhar, usar texto como mensagem
              errorData = { 
                message: responseText,
                parseError: true 
              }
            }
          } else {
            // Resposta não é JSON
            errorData = { 
              message: responseText,
              isText: true 
            }
          }
        }
      } catch (parseError: any) {
        console.error('Erro ao processar resposta de erro:', parseError)
        errorData = { 
          message: `Erro ao processar resposta: ${parseError.message}`,
          processingError: true 
        }
      }

      // Construir mensagem de erro detalhada
      if (errorData) {
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error)
        } else if (errorData.details) {
          errorMessage = typeof errorData.details === 'string'
            ? errorData.details
            : JSON.stringify(errorData.details)
        } else {
          errorMessage = `Erro ${response.status}: ${response.statusText}`
        }

        // Adicionar detalhes extras se disponíveis
        if (errorData.details && errorData.details !== errorMessage) {
          errorMessage += ` - Detalhes: ${errorData.details}`
        }
      } else {
        errorMessage = `Erro ${response.status}: ${response.statusText || 'Erro desconhecido'}`
      }

      // Log completo e detalhado para debug
      console.error('❌ Erro na requisição:', {
        ...responseInfo,
        errorData,
        errorMessage,
        timestamp: new Date().toISOString()
      })
      
      const error = new Error(errorMessage)
      ;(error as any).status = response.status
      ;(error as any).statusText = response.statusText
      ;(error as any).errorData = errorData
      
      throw error
    }

    // Resposta bem-sucedida
    let responseData: any = null

    try {
      const responseText = await response.text()
      
      // Se resposta está vazia (comum em DELETE ou alguns POST)
      if (!responseText || responseText.trim() === '') {
        console.log('✅ Requisição bem-sucedida (resposta vazia):', {
          url,
          status: response.status,
          statusText: response.statusText
        })
        return { success: true, data: null }
      }

      // Tentar parsear como JSON
      if (isJson) {
        try {
          responseData = JSON.parse(responseText)
        } catch (jsonError) {
          console.warn('⚠️ Resposta não é JSON válido, retornando como texto:', responseText)
          return { success: true, data: responseText }
        }
      } else {
        // Resposta não é JSON
        return { success: true, data: responseText }
      }

      // Se a resposta tem formato { success, data }, retornar diretamente
      if (typeof responseData === 'object' && responseData !== null && 'success' in responseData) {
        return responseData
      }
      
      // Caso contrário, envolver em formato padrão
      return { success: true, data: responseData }
    } catch (parseError: any) {
      console.error('❌ Erro ao processar resposta bem-sucedida:', parseError)
      throw new Error(`Erro ao processar resposta: ${parseError.message}`)
    }
  } catch (error: any) {
    // Log de erro geral com contexto completo
    console.error('❌ Erro em authenticatedFetch:', {
      url,
      method: options.method || 'GET',
      error: {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        errorData: error.errorData,
        stack: error.stack
      },
      response: response ? {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      } : 'Nenhuma resposta recebida',
      timestamp: new Date().toISOString()
    })
    
    throw error
  }
}

// Função para garantir que o bucket existe (simplificada - apenas verifica)
export async function ensureBucketExists() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Por favor, configure as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }

  try {
    // Verificar se o bucket existe listando arquivos
    const { data, error } = await supabase.storage
      .from('processo-documentos')
      .list('', { limit: 1 })

    if (error) {
      // Se erro for de bucket não encontrado, instruir usuário
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        throw new Error(
          '❌ O bucket "processo-documentos" não existe no Supabase Storage.\n\n' +
          'Por favor, crie o bucket manualmente no Supabase Dashboard:\n\n' +
          '1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/storage/buckets\n' +
          '2. Clique em "New bucket"\n' +
          '3. Configure:\n' +
          '   • Nome: processo-documentos\n' +
          '   • Público: Sim (marque "Public bucket")\n' +
          '   • Limite de tamanho: 100MB (104857600 bytes)\n' +
          '4. Após criar, adicione as políticas RLS:\n' +
          '   • INSERT: authenticated, anon\n' +
          '   • SELECT: authenticated, anon\n' +
          '   • UPDATE: authenticated, anon'
        )
      }
      
      // Outros erros de permissão
      if (error.message.includes('policy') || error.message.includes('permission')) {
        throw new Error(
          '❌ Erro de permissão no bucket "processo-documentos".\n\n' +
          'Configure as políticas RLS no Supabase Dashboard:\n\n' +
          '1. Acesse: Storage > processo-documentos > Policies\n' +
          '2. Adicione as seguintes políticas:\n\n' +
          '   Policy 1 - Upload público:\n' +
          '   • Operation: INSERT\n' +
          '   • Target roles: authenticated, anon\n' +
          '   • Policy definition: bucket_id = \'processo-documentos\'\n\n' +
          '   Policy 2 - Leitura pública:\n' +
          '   • Operation: SELECT\n' +
          '   • Target roles: authenticated, anon\n' +
          '   • Policy definition: bucket_id = \'processo-documentos\'\n\n' +
          '   Policy 3 - Atualização pública:\n' +
          '   • Operation: UPDATE\n' +
          '   • Target roles: authenticated, anon\n' +
          '   • Policy definition: bucket_id = \'processo-documentos\''
        )
      }

      throw error
    }

    return true
  } catch (error: any) {
    console.error('Erro ao verificar bucket:', error)
    throw error
  }
}
