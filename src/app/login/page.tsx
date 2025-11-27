"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    prefeitura: ''
  })

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
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      // Autenticação com Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      // Verificar se usuário pertence à prefeitura selecionada
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('*, prefeituras(*)')
        .eq('auth_user_id', authData.user.id)
        .eq('prefeitura_id', formData.prefeitura)
        .single()

      if (userError || !usuario) {
        throw new Error('Usuário não autorizado para esta prefeitura')
      }

      if (!usuario.ativo) {
        throw new Error('Usuário inativo. Contate o administrador.')
      }

      // Atualizar último acesso
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', usuario.id)

      // Salvar dados da sessão
      localStorage.setItem('sglc_prefeitura_id', formData.prefeitura)
      localStorage.setItem('sglc_user_role', usuario.role)
      localStorage.setItem('sglc_user_name', usuario.nome)

      toast.success('Login realizado com sucesso!')
      router.push('/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
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
            {/* Seleção de Prefeitura */}
            <div className="space-y-2">
              <Label htmlFor="prefeitura">Prefeitura</Label>
              <Select
                value={formData.prefeitura}
                onValueChange={(value) => setFormData({ ...formData, prefeitura: value })}
                required
              >
                <SelectTrigger id="prefeitura">
                  <SelectValue placeholder="Selecione a prefeitura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exemplo-1">Prefeitura Municipal de Exemplo</SelectItem>
                  <SelectItem value="exemplo-2">Prefeitura Municipal de Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            {/* Botão de Login */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            {/* Link de recuperação */}
            <div className="text-center text-sm text-gray-600">
              <a href="#" className="text-blue-600 hover:underline">
                Esqueceu sua senha?
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
