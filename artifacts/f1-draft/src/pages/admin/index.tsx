import { useGetAdminStats, getGetAdminStatsQueryKey, useSyncGPData, useRecalculateGPScores, useGetNextGP, getGetNextGPQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Flag, Trophy, Shield, Settings, Database, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { data: stats, isLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() }
  });

  const { data: nextGP } = useGetNextGP({
    query: { queryKey: getGetNextGPQueryKey() }
  });

  const syncMutation = useSyncGPData();
  const recalcMutation = useRecalculateGPScores();

  const handleSync = (gpId: string) => {
    syncMutation.mutate({ id: gpId }, {
      onSuccess: (res) => {
        toast({ title: "Sincronização Concluída", description: res.message });
      },
      onError: (err: any) => {
        toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleRecalc = (gpId: string) => {
    recalcMutation.mutate({ gpId }, {
      onSuccess: () => {
        toast({ title: "Recálculo Iniciado", description: "As pontuações estão sendo recalculadas." });
      },
      onError: (err: any) => {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Administração</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase">Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase">Ligas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.totalLeagues || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase">Drafts Salvos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.totalDrafts || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary uppercase">Temporada Ativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.activeSeason || "-"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/gps">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
            <Flag className="h-6 w-6 text-primary" />
            <span className="font-bold">Gerenciar GPs</span>
          </Button>
        </Link>
        <Link href="/admin/drivers">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <span className="font-bold">Gerenciar Pilotos</span>
          </Button>
        </Link>
        <Link href="/admin/teams">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold">Gerenciar Equipes</span>
          </Button>
        </Link>
        <Link href="/admin/scoring">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <span className="font-bold">Regras de Pontuação</span>
          </Button>
        </Link>
      </div>

      <Card className="bg-card border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Database className="h-5 w-5" /> Ferramentas de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-bold">Sincronizar OpenF1</p>
              <p className="text-sm text-muted-foreground">Busca resultados da API OpenF1 para o GP mais recente.</p>
              {stats?.lastSyncedAt && <p className="text-xs text-muted-foreground mt-1">Última sync: {new Date(stats.lastSyncedAt).toLocaleString()}</p>}
            </div>
            <Button onClick={() => nextGP && handleSync(nextGP.id)} disabled={syncMutation.isPending || !nextGP} variant="secondary">
              <RotateCcw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} /> Sincronizar
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-bold">Recalcular Pontuações</p>
              <p className="text-sm text-muted-foreground">Força o recálculo de pontuações de drafts baseados nos resultados atuais.</p>
            </div>
            <Button onClick={() => nextGP && handleRecalc(nextGP.id)} disabled={recalcMutation.isPending || !nextGP} variant="secondary">
              <RotateCcw className={`h-4 w-4 mr-2 ${recalcMutation.isPending ? 'animate-spin' : ''}`} /> Recalcular
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
