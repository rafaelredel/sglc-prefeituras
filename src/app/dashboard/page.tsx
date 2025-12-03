"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  FileSignature, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Settings,
  RefreshCw
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { authenticatedFetch, isSupabaseConfigured } from '@/lib/supabase'

const COLORS = ['#3b82f6', '#eab308', '#ef4444', '#8b5cf6', '#10b981', '#f97316']

// Valores padrão para evitar erros
const DEFAULT_STATS = {
  licitacoes_abertas: 0,
  licitacoes_andamento: 0,
  licitacoes_concluidas: 0,
  contratos_vigentes: 0,
  contratos_encerrados: 0,
  contratos_vencer_90dias: 0,
  valor_total: 0,
  saldo_remanescente: 0
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [licitacoesPorModalidade, setLicitacoesPorModalidade] = useState<any[]>([])
  const [contratosPorSecretaria, setContratosPorSecretaria] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError(null)

      if (!isSupabaseConfigured()) {
        setError('Supabase não configurado. Configure as variáveis de ambiente.')
        setStats(DEFAULT_STATS)
        return
      }

      const result = await authenticatedFetch('/api/dashboard')
      
      if (result?.success && result?.data) {
        setStats(result.data.stats || DEFAULT_STATS)
        setLicitacoesPorModalidade(result.data.licitacoesPorModalidade || [])
        setContratosPorSecretaria(result.data.contratosPorSecretaria || [])
      } else {
        setError(result?.message || 'Erro ao carregar dados')
        setStats(DEFAULT_STATS)
      }
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error)
      setError(error.message || 'Erro ao carregar dashboard. Tente novamente.')
      setStats(DEFAULT_STATS)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const statsCards = [
    {
      title: 'Licitações Abertas',
      value: (stats?.licitacoes_abertas || 0).toString(),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Licitações em Andamento',
      value: (stats?.licitacoes_andamento || 0).toString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Contratos Vigentes',
      value: (stats?.contratos_vigentes || 0).toString(),
      icon: FileSignature,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Contratos a Vencer (90 dias)',
      value: (stats?.contratos_vencer_90dias || 0).toString(),
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao Carregar Dashboard</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Botões de Ação */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral do sistema de processos administrativos</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadDashboardData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button
            variant="default"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Cards de Valores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Valor Total</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.valor_total || 0)}</p>
                <p className="text-blue-100 text-xs mt-1">Soma de todos os processos</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Saldo Remanescente</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.saldo_remanescente || 0)}</p>
                <p className="text-green-100 text-xs mt-1">Disponível para novos processos</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Licitações por Modalidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Licitações por Modalidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {licitacoesPorModalidade.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={licitacoesPorModalidade}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {licitacoesPorModalidade.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Nenhuma licitação cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratos por Secretaria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-green-600" />
              Processos por Secretaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contratosPorSecretaria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contratosPorSecretaria}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="secretaria" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Nenhum processo cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Licitações Concluídas</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.licitacoes_concluidas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Contratos Encerrados</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.contratos_encerrados || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total de Processos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(stats?.licitacoes_abertas || 0) + 
                   (stats?.licitacoes_andamento || 0) + 
                   (stats?.licitacoes_concluidas || 0) + 
                   (stats?.contratos_vigentes || 0) + 
                   (stats?.contratos_encerrados || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
