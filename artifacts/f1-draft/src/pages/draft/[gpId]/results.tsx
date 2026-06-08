import { useParams, Link } from "wouter";
import { useGetGP, getGetGPQueryKey, useGetMyDraftBreakdown, getGetMyDraftBreakdownQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ChevronLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DraftResultsPage() {
  const params = useParams();
  const gpId = params.gpId as string;

  const { data: gp, isLoading: gpLoading } = useGetGP(gpId, {
    query: {
      queryKey: getGetGPQueryKey(gpId),
      enabled: !!gpId,
    }
  });

  const { data: breakdown, isLoading: breakdownLoading } = useGetMyDraftBreakdown(gpId, {
    query: {
      queryKey: getGetMyDraftBreakdownQueryKey(gpId),
      enabled: !!gpId,
    }
  });

  if (gpLoading || breakdownLoading) {
    return <div className="p-8 text-center">Carregando resultados...</div>;
  }

  if (!gp || !breakdown) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="mb-4">Resultados não disponíveis para este GP.</p>
        <Link href="/dashboard"><Button variant="outline">Voltar ao Dashboard</Button></Link>
      </div>
    );
  }

  const driverItems = breakdown.lineItems.filter(item => item.entityType === 'driver');
  const teamItems = breakdown.lineItems.filter(item => item.entityType === 'constructor_team');
  const reserveItems = breakdown.lineItems.filter(item => item.entityType === 'reserve_driver');

  const renderSection = (title: string, items: typeof breakdown.lineItems) => {
    if (!items.length) return null;
    
    // Group by entity
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.entity]) acc[item.entity] = { total: 0, events: [] };
      acc[item.entity].total += item.points;
      acc[item.entity].events.push(item);
      return acc;
    }, {} as Record<string, { total: number, events: typeof items }>);

    return (
      <div className="space-y-4 mb-8">
        <h3 className="text-xl font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">{title}</h3>
        <div className="space-y-4">
          {Object.entries(grouped).map(([entityName, data]) => (
            <Card key={entityName} className="bg-card">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-black">{entityName}</CardTitle>
                <div className={`text-xl font-black ${data.total >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {data.total > 0 ? '+' : ''}{data.total}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1">
                  {data.events.map((event, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{event.event}</span>
                      <span className={`font-bold ${event.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {event.points > 0 ? '+' : ''}{event.points}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/draft/${gpId}`}>
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Resultados: {gp.name}</h1>
          <p className="text-muted-foreground">Round {gp.round}</p>
        </div>
      </div>

      <Card className="bg-primary/10 border-primary/30">
        <CardContent className="p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Pontuação Total</p>
          <div className="text-6xl font-black text-foreground">{breakdown.totalPoints}</div>
          {breakdown.reserveActivated && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 py-2 px-4 rounded-full w-fit mx-auto">
              <ShieldAlert className="h-4 w-4" /> Piloto Reserva Ativado
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        {renderSection("Pilotos", driverItems)}
        {breakdown.reserveActivated && renderSection("Piloto Reserva", reserveItems)}
        {renderSection("Construtor", teamItems)}
      </div>
    </div>
  );
}
