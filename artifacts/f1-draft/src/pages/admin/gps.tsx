import { useState } from "react";
import {
  useGetCurrentSeason, getGetCurrentSeasonQueryKey,
  useListGPs, getListGPsQueryKey,
  useUpdateGP, useSyncGPData, useRecalculateGPScores,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, X, Check, Pencil, RotateCcw, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["upcoming", "locked", "in_progress", "completed"] as const;
const STATUS_LABELS: Record<string, string> = { upcoming: "Agendado", locked: "Fechado", in_progress: "Em Andamento", completed: "Concluído" };
const STATUS_COLORS: Record<string, string> = { upcoming: "text-blue-400", locked: "text-yellow-400", in_progress: "text-green-400", completed: "text-muted-foreground" };

type EditState = { status: string; draftLockTime: string; raceDate: string; hasSprint: boolean };

export default function AdminGPs() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ status: "upcoming", draftLockTime: "", raceDate: "", hasSprint: false });

  const { data: season } = useGetCurrentSeason({ query: { queryKey: getGetCurrentSeasonQueryKey() } });
  const { data: gps, isLoading } = useListGPs(season?.id ?? "", {
    query: { queryKey: getListGPsQueryKey(season?.id ?? ""), enabled: !!season?.id }
  });
  const updateMutation = useUpdateGP();
  const syncMutation = useSyncGPData();
  const recalcMutation = useRecalculateGPScores();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListGPsQueryKey(season?.id ?? "") });

  const startEdit = (gp: any) => {
    setEditing(gp.id);
    setEditForm({ status: gp.status, draftLockTime: gp.draftLockTime?.slice(0, 16) ?? "", raceDate: gp.raceDate ?? "", hasSprint: gp.hasSprint ?? false });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, data: { status: editForm.status as any, draftLockTime: editForm.draftLockTime ? new Date(editForm.draftLockTime).toISOString() : undefined, raceDate: editForm.raceDate || undefined, hasSprint: editForm.hasSprint } }, {
      onSuccess: () => { toast({ title: "GP atualizado!" }); setEditing(null); invalidate(); },
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  const handleSync = (gpId: string, gpName: string) => {
    syncMutation.mutate({ id: gpId }, {
      onSuccess: (res) => toast({ title: "Sincronizado!", description: res.message ?? gpName }),
      onError: (e: any) => toast({ title: "Erro no sync", description: e.message, variant: "destructive" }),
    });
  };

  const handleRecalc = (gpId: string) => {
    recalcMutation.mutate({ gpId }, {
      onSuccess: (res: any) => toast({ title: "Recalculado!", description: `${res.updatedCount ?? 0} drafts atualizados` }),
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">GPs</h1>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {gps?.map(gp => (
              <div key={gp.id} className="p-3">
                {editing === gp.id ? (
                  <div className="space-y-3">
                    <p className="font-bold text-sm text-primary">Round {gp.round}: {gp.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Status</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <Label className="flex items-center gap-2 cursor-pointer pb-2">
                          <input type="checkbox" checked={editForm.hasSprint} onChange={e => setEditForm(f => ({ ...f, hasSprint: e.target.checked }))} className="h-4 w-4" />
                          <span className="text-sm">Sprint</span>
                        </Label>
                      </div>
                      <div><Label className="text-xs">Data da Corrida</Label><Input type="date" value={editForm.raceDate} onChange={e => setEditForm(f => ({ ...f, raceDate: e.target.value }))} /></div>
                      <div><Label className="text-xs">Fechamento do Draft</Label><Input type="datetime-local" value={editForm.draftLockTime} onChange={e => setEditForm(f => ({ ...f, draftLockTime: e.target.value }))} /></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      <Button size="sm" onClick={() => saveEdit(gp.id)} disabled={updateMutation.isPending}><Check className="h-4 w-4 mr-1" /> Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">R{gp.round} · {gp.name}</p>
                        {gp.hasSprint && <span className="text-xs bg-primary/20 text-primary px-1 rounded flex-shrink-0">SPRINT</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{gp.raceDate} · <span className={STATUS_COLORS[gp.status]}>{STATUS_LABELS[gp.status] ?? gp.status}</span></p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" title="Sincronizar OpenF1" onClick={() => handleSync(gp.id, gp.name)} disabled={syncMutation.isPending}>
                        <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" title="Recalcular pontuações" onClick={() => handleRecalc(gp.id)} disabled={recalcMutation.isPending}>
                        <RotateCcw className={`h-3.5 w-3.5 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(gp)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
