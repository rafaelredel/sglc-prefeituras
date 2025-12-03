"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Building2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SetupCityhallProps {
  onComplete: () => void
}

export function SetupCityhall({ onComplete }: SetupCityhallProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    city: '',
    state: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!supabase) {
        setError('Supabase não configurado')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Usuário não autenticado')
        return
      }

      // Validar campos obrigatórios
      if (!formData.email || !formData.email.includes('@')) {
        setError('Email válido é obrigatório')
        setLoading(false)
        return
      }

      // Criar prefeitura
      const { data: cityhall, error: createError } = await supabase
        .from('cityhalls')
        .insert({
          name: formData.name,
          cnpj: formData.cnpj || null,
          email: formData.email,
          phone: formData.phone || null,
          city: formData.city,
          state: formData.state,
          status: 'active'
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Atualizar metadados do usuário
      if (cityhall) {
        await supabase.auth.admin.updateUserById(session.user.id, {
          user_metadata: {
            ...session.user.user_metadata,
            cityhall_id: cityhall.id,
            cityhall_name: cityhall.name
          }
        })
      }

      onComplete()
    } catch (err) {
      console.error('Erro ao criar prefeitura:', err)
      setError(err instanceof Error ? err.message : 'Erro ao criar prefeitura')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Configuração Inicial</CardTitle>
              <CardDescription>
                Configure sua prefeitura para começar
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Prefeitura *</Label>
              <Input
                id="name"
                placeholder="Ex: Prefeitura Municipal de..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@prefeitura.gov.br"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 0000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  placeholder="Ex: São Paulo"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  placeholder="Ex: SP"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
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
                  <span className="animate-spin mr-2">⏳</span>
                  Configurando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Concluir Configuração
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
