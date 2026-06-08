import { useGetGlobalRanking, getGetGlobalRankingQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { Link } from "wouter";

export default function Standings() {
  const { data: ranking, isLoading } = useGetGlobalRanking(undefined, {
    query: {
      queryKey: getGetGlobalRankingQueryKey(),
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Classificação Global</h1>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="divide-y divide-border">
              {Array.isArray(ranking) && ranking.map((entry) => (
                <div key={entry.userId} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
                  <div className="w-10 text-center font-bold text-muted-foreground text-lg">
                    {entry.rank}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold border border-border">
                    {entry.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-lg leading-tight">{entry.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{entry.handle}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-2xl text-primary">{entry.totalPoints}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">pts</p>
                  </div>
                </div>
              ))}
              {(!Array.isArray(ranking) || !ranking.length) && (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Nenhuma pontuação registrada na temporada.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
