import { useState } from "react";
import {
  useListConstructorTeams, getListConstructorTeamsQueryKey,
  useUpdateConstructorTeam, useCreateConstructorTeam,
  useGetCurrentSeason, getGetCurrentSeasonQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Plus, X, Check, Pencil } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type EditState = { name: string; shortName: string; nationality: string; color: string; price: string };

export default function AdminTeams() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ name: "", shortName: "", nationality: "", color: "", price: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<EditState>({ name: "", shortName: "", nationality: "", color: "#FFFFFF", price: "" });

  const { data: season } = useGetCurrentSeason({ query: { queryKey: getGetCurrentSeasonQueryKey() } });
  const { data: teams, isLoading } = useListConstructorTeams(undefined, { query: { queryKey: getListConstructorTeamsQueryKey() } });
  const updateMutation = useUpdateConstructorTeam();
  const createMutation = useCreateConstructorTeam();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListConstructorTeamsQueryKey() });

  const startEdit = (t: any) => {
    setEditing(t.id);
    setEditForm({ name: t.name, shortName: t.shortName || "", nationality: t.nationality || "", color: t.color || "#FFFFFF", price: String(t.price) });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, data: { name: editForm.name, shortName: editForm.shortName, color: editForm.color, price: Number(editForm.price) } }, {
      onSuccess: () => { toast({ title: "Equipe atualizada!" }); setEditing(null); invalidate(); },
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  const saveCreate = () => {
    if (!season?.id) return;
    createMutation.mutate({ data: { seasonId: season.id, name: createForm.name, shortName: createForm.shortName, nationality: createForm.nationality, color: createForm.color, price: Number(createForm.price) } }, {
      onSuccess: () => { toast({ title: "Equipe criada!" }); setShowCreate(false); setCreateForm({ name: "", shortName: "", nationality: "", color: "#FFFFFF", price: "" }); invalidate(); },
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter flex-1">Equipes</h1>
        <Button size="sm" onClick={() => setShowCreate(v => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      {showCreate && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="font-bold text-sm uppercase text-primary">Nova Equipe</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome</Label><Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="McLaren" /></div>
              <div><Label className="text-xs">Sigla (3 letras)</Label><Input value={createForm.shortName} onChange={e => setCreateForm(f => ({ ...f, shortName: e.target.value }))} placeholder="MCL" maxLength={3} /></div>
              <div><Label className="text-xs">Nacionalidade</Label><Input value={createForm.nationality} onChange={e => setCreateForm(f => ({ ...f, nationality: e.target.value }))} placeholder="British" /></div>
              <div><Label className="text-xs">Preço (M)</Label><Input type="number" step="0.5" value={createForm.price} onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))} placeholder="20" /></div>
              <div><Label className="text-xs">Cor (hex)</Label><div className="flex gap-2"><Input value={createForm.color} onChange={e => setCreateForm(f => ({ ...f, color: e.target.value }))} placeholder="#FF8000" /><input type="color" value={createForm.color} onChange={e => setCreateForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-10 rounded cursor-pointer border border-input" /></div></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={saveCreate} disabled={createMutation.isPending}><Check className="h-4 w-4 mr-1" /> Criar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {teams?.map(team => (
              <div key={team.id} className="p-3">
                {editing === team.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Nome</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div><Label className="text-xs">Sigla</Label><Input value={editForm.shortName} onChange={e => setEditForm(f => ({ ...f, shortName: e.target.value }))} maxLength={3} /></div>
                      <div><Label className="text-xs">Nacionalidade</Label><Input value={editForm.nationality} onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))} /></div>
                      <div><Label className="text-xs">Preço (M)</Label><Input type="number" step="0.5" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} /></div>
                      <div className="col-span-2"><Label className="text-xs">Cor</Label><div className="flex gap-2"><Input value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} /><input type="color" value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-10 rounded cursor-pointer border border-input" /></div></div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      <Button size="sm" onClick={() => saveEdit(team.id)} disabled={updateMutation.isPending}><Check className="h-4 w-4 mr-1" /> Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: team.color || "#888" }} />
                      <div>
                        <p className="font-bold">{team.name}</p>
                        <p className="text-xs text-muted-foreground">${team.price}M</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(team)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            ))}
            {(!teams || teams.length === 0) && <div className="p-8 text-center text-muted-foreground">Nenhuma equipe cadastrada.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
