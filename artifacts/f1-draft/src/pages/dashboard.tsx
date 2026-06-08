import { useAuth } from "@/contexts/AuthContext";
import { useGetNextGP, useGetMyScoreSummary, useGetMyLeagues, getGetNextGPQueryKey, getGetMyScoreSummaryQueryKey, getGetMyLeaguesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trophy, Clock, Flag, ArrowRight, DollarSign } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: nextGP } = useGetNextGP({
    query: {
      queryKey: getGetNextGPQueryKey(),
    }
  });

  const { data: scoreSummary } = useGetMyScoreSummary(undefined, {
    query: {
      queryKey: getGetMyScoreSummaryQueryKey(),
    }
  });

  const { data: leagues } = useGetMyLeagues({
    query: {
      queryKey: getGetMyLeaguesQueryKey(),
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo de volta, Chefe de Equipe.</p>
        </div>
        <div className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Orçamento</p>
              <p className="font-bold text-lg leading-none">${user?.budget?.toFixed(1)}M</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Next GP Card - Spans 2 cols */}
        <Card className="md:col-span-2 border-primary/20 bg-card/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold uppercase italic tracking-tight text-primary">
              <Clock className="h-5 w-5" /> Próximo GP
            </CardTitle>
          </CardHeader>
          {nextGP ? (
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">Round {nextGP.round}</p>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-2">{nextGP.name}</h3>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4" /> {nextGP.circuitName}
                  </p>
                  <div className="mt-6 flex gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Data da Corrida</p>
                      <p className="font-bold">{format(new Date(nextGP.raceDate), "dd MMM, HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Mercado Fecha</p>
                      <p className="font-bold text-primary">{formatDistanceToNow(new Date(nextGP.draftLockTime), { addSuffix: true, locale: ptBR })}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-end">
                  <Link href={`/draft/${nextGP.id}`}>
                    <Button size="lg" className="w-full md:w-auto uppercase font-bold italic tracking-wider">
                      Montar Equipe <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Nenhum GP agendado no momento.</p>
            </CardContent>
          )}
        </Card>

        {/* Score Summary */}
        <Card className="bg-card/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold uppercase italic tracking-tight">
              <Trophy className="h-5 w-5 text-primary" /> Temporada
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {scoreSummary ? (
              <div className="space-y-6">
                <div className="text-center p-4 bg-secondary/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Pontos Totais</p>
                  <p className="text-4xl font-black text-primary">{scoreSummary.totalPoints}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Posição</p>
                    <p className="text-2xl font-bold">#{scoreSummary.rank}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Jogadores</p>
                    <p className="text-2xl font-bold">{scoreSummary.totalUsers || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Nenhuma pontuação registrada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leagues Quick View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold uppercase italic tracking-tight">Suas Ligas</h2>
          <Link href="/leagues">
            <Button variant="ghost" size="sm" className="uppercase font-bold text-xs tracking-wider text-muted-foreground hover:text-foreground">
              Ver Todas
            </Button>
          </Link>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leagues?.slice(0, 3).map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="hover:bg-secondary/50 transition-colors cursor-pointer border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg truncate">{league.name}</h3>
                    {league.isFactory && (
                      <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-bold uppercase">Oficial</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Flag className="h-3 w-3" /> {league.memberCount} membros
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!leagues || leagues.length === 0) && (
            <div className="col-span-full p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground">
              <p className="mb-4">Você ainda não participa de nenhuma liga.</p>
              <Link href="/leagues">
                <Button variant="outline">Encontrar Ligas</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
