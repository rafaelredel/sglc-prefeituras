"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Search, FileText } from 'lucide-react'

export default function AnexosPage() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anexos</h1>
          <p className="text-gray-600 mt-1">Gerencie documentos e arquivos do sistema</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Upload className="h-4 w-4 mr-2" />
          Upload de Arquivo
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar arquivos por nome, tipo ou processo..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Anexos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Anexados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Módulo de Anexos em desenvolvimento</p>
            <p className="text-sm mt-2">MÓDULO 4 - Upload, visualização e download de documentos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
