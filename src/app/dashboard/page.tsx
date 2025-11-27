"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  FileSignature, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Dados mockados para demonstração
const statsCards = [
  {
    title: 'Licitações Abertas',
    value: '12',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Licitações em Andamento',
    value: '28',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  {
    title: 'Contratos Vigentes',
    value: '156',
    icon: FileSignature,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Contratos a Vencer (90 dias)',
    value: '23',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
]

const licitacoesPorModalidade = [
  { name: 'Pregão', value: 45 },
  { name: 'Dispensa', value: 28 },
  { name: 'Inexigibilidade', value: 15 },
  { name: 'Concorrência', value: 12 },
]

const contratosPorSecretaria = [
  { secretaria: 'Educação', quantidade: 42 },
  { secretaria: 'Saúde', quantidade: 38 },
  { secretaria: 'Obras', quantidade: 31 },
  { secretaria: 'Administração', quantidade: 25 },
  { secretaria: 'Assistência Social', quantidade: 20 },
]

const alertas = [
  {
    id: 1,
    tipo: 'vencimento',
    titulo: 'Contrato 045/2024 vence em 15 dias',
    descricao: 'Contrato de limpeza pública',
    prioridade: 'alta',
  },
  {
    id: 2,
    tipo: 'publicacao',
    titulo: 'Publicação pendente - Licitação 023/2024',
    descricao: 'Aguardando publicação no Diário Oficial',
    prioridade: 'media',
  },
  {
    id: 3,
    tipo: 'etapa',
    titulo: 'Etapa atrasada - Licitação 019/2024',
    descricao: 'Revisão jurídica pendente há 5 dias',
    prioridade: 'alta',
  },
  {
    id: 4,
    tipo: 'documento',
    titulo: 'Anexos faltando - Contrato 038/2024',
    descricao: '3 documentos obrigatórios não anexados',
    prioridade: 'media',
  },
]

const COLORS = ['#3b82f6', '#eab308', '#ef4444', '#8b5cf6']

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do sistema de licitações e contratos</p>
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

      {/* Gráficos */}
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
          </CardContent>
        </Card>

        {/* Contratos por Secretaria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-green-600" />
              Contratos por Secretaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contratosPorSecretaria}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="secretaria" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Pendências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Alertas e Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className={`
                  p-2 rounded-lg
                  ${alerta.prioridade === 'alta' ? 'bg-red-100' : 'bg-yellow-100'}
                `}>
                  {alerta.tipo === 'vencimento' && <Calendar className="h-5 w-5 text-red-600" />}
                  {alerta.tipo === 'publicacao' && <FileText className="h-5 w-5 text-yellow-600" />}
                  {alerta.tipo === 'etapa' && <Clock className="h-5 w-5 text-red-600" />}
                  {alerta.tipo === 'documento' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{alerta.titulo}</h4>
                  <p className="text-sm text-gray-600 mt-1">{alerta.descricao}</p>
                </div>
                <span className={`
                  px-3 py-1 rounded-full text-xs font-medium
                  ${alerta.prioridade === 'alta' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-yellow-100 text-yellow-700'
                  }
                `}>
                  {alerta.prioridade === 'alta' ? 'Alta' : 'Média'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Licitações Encerradas</p>
                <p className="text-2xl font-bold text-gray-900">87</p>
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
                <p className="text-2xl font-bold text-gray-900">234</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Anexos Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">15</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
