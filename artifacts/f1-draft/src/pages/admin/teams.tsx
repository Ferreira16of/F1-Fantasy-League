import { useListConstructorTeams, getListConstructorTeamsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Edit2, Plus, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function AdminTeams() {
  const { data: teams, isLoading } = useListConstructorTeams(undefined, {
    query: { queryKey: getListConstructorTeamsQueryKey() }
  });

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 flex justify-between items-center">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Gerenciar Equipes</h1>
          <Button disabled className="opacity-50"><Plus className="h-4 w-4 mr-2" /> Nova Equipe</Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {teams?.map(team => (
              <div key={team.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color || '#fff' }}></div>
                  <div>
                    <p className="font-bold">{team.name}</p>
                    <p className="text-sm text-muted-foreground">${team.price}M</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" disabled title="Em breve">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground text-center">A edição de equipes via UI será implementada em breve.</p>
    </div>
  );
}
