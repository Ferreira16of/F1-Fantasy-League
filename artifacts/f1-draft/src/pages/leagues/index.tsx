import { useListLeagues, useGetMyLeagues, useJoinLeague, getListLeaguesQueryKey, getGetMyLeaguesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag, Search, Plus, Users, Lock, Unlock } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Leagues() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myLeagues } = useGetMyLeagues({
    query: { queryKey: getGetMyLeaguesQueryKey() }
  });

  const { data: publicLeagues } = useListLeagues({ q: search }, {
    query: { queryKey: getListLeaguesQueryKey({ q: search }) }
  });

  const joinLeague = useJoinLeague();

  const handleJoin = (id: string) => {
    joinLeague.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Bem-vindo à liga!" });
        queryClient.invalidateQueries({ queryKey: getGetMyLeaguesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListLeaguesQueryKey({ q: search }) });
      },
      onError: (err: any) => {
        toast({ title: "Erro ao entrar", description: err.message, variant: "destructive" });
      }
    });
  };

  const isMember = (id: string) => myLeagues?.some(l => l.id === id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Flag className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Ligas</h1>
        </div>
        <Link href="/leagues/new">
          <Button className="uppercase font-bold tracking-wider">
            <Plus className="h-4 w-4 mr-2" /> Criar Liga
          </Button>
        </Link>
      </div>

      {myLeagues && myLeagues.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase italic tracking-tight text-muted-foreground">Minhas Ligas</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myLeagues.map((league) => (
              <Link key={league.id} href={`/leagues/${league.id}`}>
                <Card className="hover:bg-secondary/50 transition-colors cursor-pointer border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span className="truncate pr-2">{league.name}</span>
                      {league.isFactory && <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-bold">OFICIAL</span>}
                    </CardTitle>
                    {league.description && <CardDescription className="truncate">{league.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {league.memberCount}</span>
                      <span className="flex items-center gap-1">
                        {league.isPublic ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {league.isPublic ? 'Pública' : 'Privada'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-bold uppercase italic tracking-tight text-muted-foreground">Explorar Ligas Públicas</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar ligas..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicLeagues?.filter(l => !isMember(l.id)).map((league) => (
            <Card key={league.id} className="bg-card flex flex-col">
              <CardHeader className="pb-2 flex-1">
                <CardTitle className="flex justify-between items-center">
                  <span className="truncate pr-2">{league.name}</span>
                  {league.isFactory && <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-bold">OFICIAL</span>}
                </CardTitle>
                {league.description && <CardDescription className="line-clamp-2">{league.description}</CardDescription>}
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {league.memberCount} membros</span>
                  <span className="flex items-center gap-1"><Unlock className="h-3 w-3" /> Pública</span>
                </div>
                <Button className="w-full" variant="outline" onClick={() => handleJoin(league.id)} disabled={joinLeague.isPending}>
                  Participar
                </Button>
              </CardContent>
            </Card>
          ))}
          {publicLeagues?.filter(l => !isMember(l.id)).length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
              Nenhuma liga pública encontrada.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
