import { useState, useEffect } from "react";
import { useGetScoringRules, getGetScoringRulesQueryKey, useUpdateScoringRules } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Form = {
  fastestLapPoints: string; polePoints: string; overtakePoints: string;
  dnfPenalty: string; crashPenalty: string; pitStopTopPoints: string;
  pitStopBottomPenalty: string; constructorTopPoints: string; constructorBottomPenalty: string;
};

export default function AdminScoring() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rules, isLoading } = useGetScoringRules({ query: { queryKey: getGetScoringRulesQueryKey() } });
  const updateMutation = useUpdateScoringRules();

  const [form, setForm] = useState<Form>({ fastestLapPoints: "", polePoints: "", overtakePoints: "", dnfPenalty: "", crashPenalty: "", pitStopTopPoints: "", pitStopBottomPenalty: "", constructorTopPoints: "", constructorBottomPenalty: "" });

  useEffect(() => {
    if (rules) setForm({
      fastestLapPoints: String(rules.fastestLapPoints ?? 0),
      polePoints: String(rules.polePoints ?? 0),
      overtakePoints: String(rules.overtakePoints ?? 0),
      dnfPenalty: String(rules.dnfPenalty ?? 0),
      crashPenalty: String(rules.crashPenalty ?? 0),
      pitStopTopPoints: String(rules.pitStopTopPoints ?? 0),
      pitStopBottomPenalty: String(rules.pitStopBottomPenalty ?? 0),
      constructorTopPoints: String(rules.constructorTopPoints ?? 0),
      constructorBottomPenalty: String(rules.constructorBottomPenalty ?? 0),
    });
  }, [rules]);

  const save = () => {
    updateMutation.mutate({ data: {
      fastestLapPoints: Number(form.fastestLapPoints),
      polePoints: Number(form.polePoints),
      overtakePoints: Number(form.overtakePoints),
      dnfPenalty: Number(form.dnfPenalty),
      crashPenalty: Number(form.crashPenalty),
      pitStopTopPoints: Number(form.pitStopTopPoints),
      pitStopBottomPenalty: Number(form.pitStopBottomPenalty),
      constructorTopPoints: Number(form.constructorTopPoints),
      constructorBottomPenalty: Number(form.constructorBottomPenalty),
    }}, {
      onSuccess: () => { toast({ title: "Regras salvas!" }); qc.invalidateQueries({ queryKey: getGetScoringRulesQueryKey() }); },
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  const reset = () => { if (rules) setForm({ fastestLapPoints: String(rules.fastestLapPoints ?? 0), polePoints: String(rules.polePoints ?? 0), overtakePoints: String(rules.overtakePoints ?? 0), dnfPenalty: String(rules.dnfPenalty ?? 0), crashPenalty: String(rules.crashPenalty ?? 0), pitStopTopPoints: String(rules.pitStopTopPoints ?? 0), pitStopBottomPenalty: String(rules.pitStopBottomPenalty ?? 0), constructorTopPoints: String(rules.constructorTopPoints ?? 0), constructorBottomPenalty: String(rules.constructorBottomPenalty ?? 0) }); };

  const F = ({ label, field, hint }: { label: string; field: keyof Form; hint?: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div><p className="font-medium text-sm">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <Input type="number" step="0.5" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} className="w-24 text-right" />
    </div>
  );

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter flex-1">Pontuação</h1>
        <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" /> Resetar</Button>
        <Button size="sm" onClick={save} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-primary">Bônus</CardTitle></CardHeader>
        <CardContent>
          <F label="Volta mais rápida" field="fastestLapPoints" />
          <F label="Pole Position" field="polePoints" />
          <F label="Ultrapassagem (por posição)" field="overtakePoints" />
          <F label="Pit stop TOP (melhor tempo)" field="pitStopTopPoints" />
          <F label="Construtor TOP" field="constructorTopPoints" />
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-destructive">Penalidades</CardTitle></CardHeader>
        <CardContent>
          <F label="DNF (abandono)" field="dnfPenalty" hint="Valor negativo ou positivo" />
          <F label="Batida / DSQ" field="crashPenalty" />
          <F label="Pit stop BOTTOM (pior tempo)" field="pitStopBottomPenalty" />
          <F label="Construtor BOTTOM" field="constructorBottomPenalty" />
        </CardContent>
      </Card>

      {rules?.racePoints && (
        <Card className="bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-muted-foreground">Pontos por Posição (Race)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {(rules.racePoints as unknown as number[]).map((pts, i) => (
                <div key={i} className="text-center p-2 bg-secondary rounded">
                  <p className="text-xs text-muted-foreground">P{i + 1}</p>
                  <p className="font-bold">{pts}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Edição de pontos por posição disponível via API.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
