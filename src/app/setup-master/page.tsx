'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react'

export default function SetupMasterPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateMaster = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/setup-master', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Erro ao criar usuário master')
      }
    } catch (err) {
      setError('Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold">Configuração Inicial</CardTitle>
          <CardDescription className="text-base">
            Criar usuário Super Admin Master do sistema
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-slate-900">Credenciais do Master:</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p><span className="font-medium">Nome:</span> Super Admin Redel</p>
              <p><span className="font-medium">Email:</span> rafaredel@icloud.com</p>
              <p><span className="font-medium">Senha:</span> S3iTaw2458</p>
              <p><span className="font-medium">Permissão:</span> Administrador Master</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && result.success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-semibold">{result.message}</p>
                  {result.credentials && (
                    <div className="text-sm space-y-1 mt-2">
                      <p><strong>Email:</strong> {result.credentials.email}</p>
                      <p><strong>Senha:</strong> {result.credentials.password}</p>
                    </div>
                  )}
                  {result.warning && (
                    <p className="text-sm font-medium text-orange-600 mt-2">
                      ⚠️ {result.warning}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleCreateMaster}
              disabled={loading}
              className="w-full h-12 text-base"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Criando usuário...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Criar Super Admin Master
                </>
              )}
            </Button>

            {result && result.success && (
              <Button
                onClick={() => window.location.href = '/login'}
                variant="outline"
                className="w-full h-12 text-base"
                size="lg"
              >
                Ir para Login
              </Button>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ Importante:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Esta página deve ser acessada apenas uma vez na configuração inicial</li>
              <li>O usuário master terá controle total sobre o sistema</li>
              <li>Altere a senha imediatamente após o primeiro login</li>
              <li>Mantenha as credenciais em local seguro</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
