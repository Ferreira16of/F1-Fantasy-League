import { useGetScoringRules, getGetScoringRulesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function AdminScoring() {
  const { data: rules, isLoading } = useGetScoringRules({
    query: { queryKey: getGetScoringRulesQueryKey() }
  });

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Regras de Pontuação</h1>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Bônus e Penalidades Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between p-2 border-b border-border">
            <span>Volta Mais Rápida</span>
            <span className="font-bold text-green-500">+{rules?.fastestLapPoints}</span>
          </div>
          <div className="flex justify-between p-2 border-b border-border">
            <span>Pole Position</span>
            <span className="font-bold text-green-500">+{rules?.polePoints}</span>
          </div>
          <div className="flex justify-between p-2 border-b border-border">
            <span>Ultrapassagem (por posição)</span>
            <span className="font-bold text-green-500">+{rules?.overtakePoints}</span>
          </div>
          <div className="flex justify-between p-2 border-b border-border">
            <span>DNF (Não Terminou)</span>
            <span className="font-bold text-red-500">{rules?.dnfPenalty}</span>
          </div>
          <div className="flex justify-between p-2 border-b border-border">
            <span>Batida/Desclassificação</span>
            <span className="font-bold text-red-500">{rules?.crashPenalty}</span>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-sm text-muted-foreground text-center mt-8">O formulário para editar estas regras será implementado em breve.</p>
    </div>
  );
}
