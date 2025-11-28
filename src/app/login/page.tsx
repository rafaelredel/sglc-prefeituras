"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/supabase'
import { loginUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingCityhalls, setLoadingCityhalls] = useState(true)
  const [cityhalls, setCityhalls] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    cityhall_id: ''
  })
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  // Carregar prefeituras disponíveis
  useEffect(() => {
    async function loadCityhalls() {
      if (!isSupabaseConfigured()) {
        setLoadingCityhalls(false)
        return
      }

      try {
        const { supabase } = await import('@/lib/supabase')
        if (!supabase) return

        const { data, error } = await supabase
          .from('cityhalls')
          .select('id, name')
          .eq('status', 'active')
          .order('name')

        if (!error && data) {
          setCityhalls(data)
        }
      } catch (error) {
        console.error('Erro ao carregar prefeituras:', error)
      } finally {
        setLoadingCityhalls(false)
      }
    }

    loadCityhalls()
  }, [])

  // Verificar se Supabase está configurado
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Configuração Necessária</CardTitle>
            <CardDescription>
              O Supabase precisa ser configurado para usar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
              <p className="font-semibold mb-2">Como configurar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Vá em Configurações do Projeto</li>
                <li>Clique em Integrações</li>
                <li>Conecte sua conta Supabase</li>
              </ol>
            </div>
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Voltar para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await loginUser({
        email: formData.email,
        password: formData.password,
        cityhall_id: formData.cityhall_id || undefined,
      })

      // Salvar dados da sessão
      localStorage.setItem('sglc_user_id', result.user.id)
      localStorage.setItem('sglc_cityhall_id', result.user.cityhall_id || '')
      localStorage.setItem('sglc_user_role', result.user.user_roles.slug)
      localStorage.setItem('sglc_user_name', result.user.name)

      toast.success('Login realizado com sucesso!')

      // Verificar se precisa trocar senha
      if (result.user.require_password_change) {
        router.push('/change-password')
      } else {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { requestPasswordReset } = await import('@/lib/auth')
      await requestPasswordReset(resetEmail)
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
      setShowForgotPassword(false)
      setResetEmail('')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao solicitar recuperação'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
            <CardDescription>
              Informe seu e-mail para receber o link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
              >
                Voltar para Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">SGLC</CardTitle>
          <CardDescription>
            Sistema de Gestão de Licitações e Contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Seleção de Prefeitura - OPCIONAL */}
            <div className="space-y-2">
              <Label htmlFor="cityhall">
                Prefeitura <span className="text-gray-400 text-sm">(opcional para admin master)</span>
              </Label>
              {loadingCityhalls ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : cityhalls.length > 0 ? (
                <select
                  id="cityhall"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.cityhall_id}
                  onChange={(e) => setFormData({ ...formData, cityhall_id: e.target.value })}
                >
                  <option value="">Nenhuma (Admin Master)</option>
                  {cityhalls.map((cityhall) => (
                    <option key={cityhall.id} value={cityhall.id}>
                      {cityhall.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-500 text-center py-3">
                  Nenhuma prefeitura cadastrada
                </div>
              )}
            </div>

            {/* Botão de Login */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            {/* Link de recuperação */}
            <div className="text-center text-sm text-gray-600">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-600 hover:underline"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
