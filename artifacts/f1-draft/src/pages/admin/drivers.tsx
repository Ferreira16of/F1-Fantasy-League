import { useState } from "react";
import {
  useListDrivers, getListDriversQueryKey,
  useUpdateDriver, useCreateDriver,
  useListConstructorTeams, getListConstructorTeamsQueryKey,
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

type EditForm = { name: string; price: string; isActive: boolean };
type CreateForm = { name: string; shortName: string; number: string; nationality: string; constructorTeamId: string; price: string };

const emptyCreate: CreateForm = { name: "", shortName: "", number: "", nationality: "", constructorTeamId: "", price: "" };

export default function AdminDrivers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", price: "", isActive: true });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);

  const { data: season } = useGetCurrentSeason({ query: { queryKey: getGetCurrentSeasonQueryKey() } });
  const { data: drivers, isLoading } = useListDrivers(undefined, { query: { queryKey: getListDriversQueryKey() } });
  const { data: teams } = useListConstructorTeams(undefined, { query: { queryKey: getListConstructorTeamsQueryKey() } });
  const updateMutation = useUpdateDriver();
  const createMutation = useCreateDriver();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListDriversQueryKey() });

  const startEdit = (d: { id: string; name: string; price: number; isActive?: boolean }) => {
    setEditing(d.id);
    setEditForm({ name: d.name, price: String(d.price), isActive: d.isActive ?? true });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, data: { name: editForm.name, price: Number(editForm.price), isActive: editForm.isActive } }, {
      onSuccess: () => { toast({ title: "Piloto atualizado!" }); setEditing(null); invalidate(); },
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  const saveCreate = () => {
    if (!season?.id) return;
    createMutation.mutate({
      data: {
        seasonId: season.id,
        name: createForm.name,
        shortName: createForm.shortName || createForm.name.split(" ").pop()!,
        number: Number(createForm.number),
        nationality: createForm.nationality,
        constructorTeamId: createForm.constructorTeamId,
        price: Number(createForm.price),
        isActive: true,
      }
    }, {
      onSuccess: () => { toast({ title: "Piloto criado!" }); setShowCreate(false); setCreateForm(emptyCreate); invalidate(); },
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter flex-1">Pilotos</h1>
        <Button size="sm" onClick={() => setShowCreate(v => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {showCreate && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="font-bold text-sm uppercase text-primary">Novo Piloto</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome completo</Label><Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Max Verstappen" /></div>
              <div><Label className="text-xs">Sigla (3 letras)</Label><Input value={createForm.shortName} onChange={e => setCreateForm(f => ({ ...f, shortName: e.target.value }))} placeholder="VER" maxLength={3} /></div>
              <div><Label className="text-xs">Número</Label><Input type="number" value={createForm.number} onChange={e => setCreateForm(f => ({ ...f, number: e.target.value }))} placeholder="1" /></div>
              <div><Label className="text-xs">Preço (M)</Label><Input type="number" step="0.5" value={createForm.price} onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))} placeholder="20" /></div>
              <div><Label className="text-xs">Nacionalidade</Label><Input value={createForm.nationality} onChange={e => setCreateForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Dutch" /></div>
              <div><Label className="text-xs">Equipe</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={createForm.constructorTeamId} onChange={e => setCreateForm(f => ({ ...f, constructorTeamId: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
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
            {drivers?.slice().sort((a, b) => a.number - b.number).map(driver => (
              <div key={driver.id} className="p-3">
                {editing === driver.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Nome</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div><Label className="text-xs">Preço (M)</Label><Input type="number" step="0.5" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} /></div>
                      <div className="col-span-2 flex items-center gap-2 pt-1">
                        <input type="checkbox" id={`active-${driver.id}`} checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4" />
                        <Label htmlFor={`active-${driver.id}`} className="text-xs cursor-pointer">Ativo</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      <Button size="sm" onClick={() => saveEdit(driver.id)} disabled={updateMutation.isPending}><Check className="h-4 w-4 mr-1" /> Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg text-muted-foreground w-6 text-right">{driver.number}</span>
                      <div>
                        <p className="font-bold">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">{driver.constructorTeamName} · ${driver.price}M</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(driver)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            ))}
            {(!drivers || drivers.length === 0) && <div className="p-8 text-center text-muted-foreground">Nenhum piloto cadastrado.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
