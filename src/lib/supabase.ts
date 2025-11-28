import { createClient } from '@supabase/supabase-js'

// Validação das variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Função para validar se a URL é válida
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Verificar se as variáveis estão configuradas e válidas
const isConfigured = isValidUrl(supabaseUrl) && Boolean(supabaseAnonKey)

// Criar cliente apenas se as variáveis estiverem configuradas corretamente
export const supabase = isConfigured && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper para verificar se o Supabase está configurado
export const isSupabaseConfigured = () => {
  return isConfigured
}
