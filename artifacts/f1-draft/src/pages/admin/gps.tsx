import { useGetCurrentSeason, getGetCurrentSeasonQueryKey, useListGPs, getListGPsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag, Edit2, Plus, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function AdminGPs() {
  const { data: season } = useGetCurrentSeason({
    query: { queryKey: getGetCurrentSeasonQueryKey() }
  });

  const { data: gps, isLoading } = useListGPs(season?.id ?? "", {
    query: {
      queryKey: getListGPsQueryKey(season?.id ?? ""),
      enabled: !!season?.id
    }
  });

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 flex justify-between items-center">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Gerenciar GPs</h1>
          <Button disabled className="opacity-50"><Plus className="h-4 w-4 mr-2" /> Novo GP</Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {gps?.map(gp => (
              <div key={gp.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold">Round {gp.round}: {gp.name}</p>
                  <p className="text-sm text-muted-foreground">{gp.circuitName} - {gp.status}</p>
                </div>
                <Button variant="ghost" size="icon" disabled title="Em breve">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {(!gps || gps.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum GP encontrado para a temporada ativa.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground text-center">O gerenciamento completo de CRUD via UI será implementado em breve.</p>
    </div>
  );
}
