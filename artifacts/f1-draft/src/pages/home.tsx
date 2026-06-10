import { useAuth } from "@/contexts/AuthContext";
import { useGetNextGP, useGetGlobalRanking, getGetNextGPQueryKey, getGetGlobalRankingQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, Flag, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Home() {
  const { user } = useAuth();
  
  const { data: nextGP } = useGetNextGP({
    query: {
      queryKey: getGetNextGPQueryKey(),
    }
  });

  const { data: globalRanking } = useGetGlobalRanking(undefined, {
    query: {
      queryKey: getGetGlobalRankingQueryKey(),
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium border border-border">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            A temporada 2025 já começou
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">
            SEU LUGAR NO <span className="text-primary">PADDOCK</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            O fantasy game definitivo de F1. Escale seus pilotos, escolha sua equipe e compita pelo campeonato mundial.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full max-w-sm mx-auto sm:max-w-none">
            {user ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full text-lg px-8 h-14 uppercase font-bold italic tracking-wider">
                  Ir para o Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full text-lg px-8 h-14 uppercase font-bold italic tracking-wider">
                    Criar Equipe
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full text-lg px-8 h-14 uppercase font-bold italic tracking-wider">
                    Entrar
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-20 px-4 max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-8">
        
        {/* Next GP */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-2xl font-bold uppercase italic tracking-tight">
            <Clock className="h-6 w-6 text-primary" />
            Próximo GP
          </div>
          
          <Card className="border-primary/20 bg-card">
            {nextGP ? (
              <CardContent className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">Round {nextGP.round}</p>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">{nextGP.name}</h3>
                    <p className="text-muted-foreground">{nextGP.circuitName}</p>
                  </div>
                  <div className="text-right">
                    <Flag className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data da Corrida</p>
                    <p className="font-medium text-lg">{format(new Date(nextGP.raceDate), "dd MMM, HH:mm", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fechamento do Mercado</p>
                    <p className="font-medium text-lg text-primary">{formatDistanceToNow(new Date(nextGP.draftLockTime), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Nenhum GP programado no momento.</p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Global Standings Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-2xl font-bold uppercase italic tracking-tight">
              <Trophy className="h-6 w-6 text-primary" />
              Top 5 Global
            </div>
            <Link href="/standings" className="text-sm text-primary hover:underline flex items-center">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          
          <Card className="bg-card">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {Array.isArray(globalRanking) && globalRanking.slice(0, 5).map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
                    <div className="w-8 text-center font-bold text-muted-foreground">
                      {entry.rank}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold border border-border">
                      {entry.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{entry.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{entry.handle}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl text-primary">{entry.totalPoints}</p>
                      <p className="text-xs text-muted-foreground uppercase">pts</p>
                    </div>
                  </div>
                ))}
                {(!Array.isArray(globalRanking) || !globalRanking.length) && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>Classificação não disponível.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </section>
    </div>
  );
}
