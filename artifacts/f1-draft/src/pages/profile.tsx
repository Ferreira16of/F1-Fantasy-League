import { useAuth } from "@/contexts/AuthContext";
import { useGetMyScoreSummary, getGetMyScoreSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Trophy, Calendar, DollarSign, Award } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user } = useAuth();
  
  const { data: scoreSummary } = useGetMyScoreSummary(undefined, {
    query: {
      queryKey: getGetMyScoreSummaryQueryKey(),
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Meu Perfil</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-card">
          <CardContent className="p-6 text-center">
            <div className="h-24 w-24 mx-auto rounded-full bg-secondary flex items-center justify-center font-black text-4xl border-2 border-border mb-4">
              {user?.displayName.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold">{user?.displayName}</h2>
            <p className="text-muted-foreground mb-6">@{user?.handle}</p>
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4"/> Orçamento</span>
                <span className="font-bold">${user?.budget?.toFixed(1)}M</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Award className="h-4 w-4 text-green-500"/> Bônus</span>
                <span className="font-bold text-green-500">+${user?.bonusBudget?.toFixed(1) || 0}M</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4"/> Membro desde</span>
                <span className="font-bold text-sm">{user?.createdAt ? format(new Date(user.createdAt), "yyyy") : "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Histórico da Temporada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreSummary ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                    <p className="text-xs uppercase font-bold text-primary mb-1 tracking-wider">Rank Global</p>
                    <p className="text-3xl font-black">#{scoreSummary.rank}</p>
                  </div>
                  <div className="p-4 bg-secondary/30 border border-border rounded-lg text-center">
                    <p className="text-xs uppercase font-bold text-muted-foreground mb-1 tracking-wider">Pontos Totais</p>
                    <p className="text-3xl font-black">{scoreSummary.totalPoints}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Corridas</h3>
                  <div className="space-y-2">
                    {scoreSummary.gpBreakdown?.map((gp) => (
                      <div key={gp.gpId} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-center text-xs font-bold text-muted-foreground bg-secondary rounded py-1">R{gp.round}</div>
                          <p className="font-bold">{gp.gpName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg leading-none">{gp.points} pts</p>
                          {gp.rank && <p className="text-xs text-muted-foreground">#{gp.rank} no GP</p>}
                        </div>
                      </div>
                    ))}
                    {!scoreSummary.gpBreakdown?.length && (
                      <div className="text-center text-muted-foreground py-4">Nenhuma corrida pontuada ainda.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">Carregando histórico...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
