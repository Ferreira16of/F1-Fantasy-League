import { useAuth } from "@/contexts/AuthContext";
import { 
  useGetGP, 
  getGetGPQueryKey,
  useGetMyDraft,
  getGetMyDraftQueryKey,
  useListDrivers,
  getListDriversQueryKey,
  useListConstructorTeams,
  getListConstructorTeamsQueryKey,
  useSaveDraft,
  Driver,
  ConstructorTeam
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Flag, Shield, User, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function DraftPage() {
  const { user } = useAuth();
  const params = useParams();
  const gpId = params.gpId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gp, isLoading: gpLoading } = useGetGP(gpId, {
    query: {
      queryKey: getGetGPQueryKey(gpId),
      enabled: !!gpId,
    }
  });

  const { data: drivers } = useListDrivers(gp ? { seasonId: gp.seasonId } : undefined, {
    query: {
      queryKey: getListDriversQueryKey(gp ? { seasonId: gp.seasonId } : undefined),
      enabled: !!gp?.seasonId,
    }
  });

  const { data: teams } = useListConstructorTeams(gp ? { seasonId: gp.seasonId } : undefined, {
    query: {
      queryKey: getListConstructorTeamsQueryKey(gp ? { seasonId: gp.seasonId } : undefined),
      enabled: !!gp?.seasonId,
    }
  });

  const { data: existingDraft, isLoading: draftLoading } = useGetMyDraft(gpId, {
    query: {
      queryKey: getGetMyDraftQueryKey(gpId),
      enabled: !!gpId,
    }
  });

  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [reserveDriver, setReserveDriver] = useState<string | null>(null);

  useEffect(() => {
    if (existingDraft) {
      setSelectedDrivers([existingDraft.driver1Id, existingDraft.driver2Id, existingDraft.driver3Id].filter(Boolean));
      setSelectedTeam(existingDraft.constructorTeamId);
      setReserveDriver(existingDraft.reserveDriverId || null);
    }
  }, [existingDraft]);

  const saveDraftMutation = useSaveDraft();

  const handleSave = () => {
    if (selectedDrivers.length !== 3 || !selectedTeam) {
      toast({ title: "Draft Incompleto", description: "Selecione 3 pilotos e 1 construtor.", variant: "destructive" });
      return;
    }

    saveDraftMutation.mutate({
      gpId,
      data: {
        driver1Id: selectedDrivers[0],
        driver2Id: selectedDrivers[1],
        driver3Id: selectedDrivers[2],
        constructorTeamId: selectedTeam,
        reserveDriverId: reserveDriver,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Draft Salvo", description: "Sua equipe foi salva com sucesso!" });
        queryClient.invalidateQueries({ queryKey: getGetMyDraftQueryKey(gpId) });
      },
      onError: (err: any) => {
        toast({ title: "Erro ao Salvar", description: err.message || "Erro desconhecido.", variant: "destructive" });
      }
    });
  };

  const isLocked = gp?.status !== 'upcoming';

  if (gpLoading || draftLoading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!gp) {
    return <div className="p-8 text-center text-red-500">GP não encontrado.</div>;
  }

  // Calculate costs
  const activeDrivers = drivers?.filter(d => d.isActive && d.seasonId === gp.seasonId) || [];
  const activeTeams = teams?.filter(t => t.seasonId === gp.seasonId) || [];

  const getDriver = (id: string) => activeDrivers.find(d => d.id === id);
  const getTeam = (id: string) => activeTeams.find(t => t.id === id);

  const selectedDriverObjects = selectedDrivers.map(getDriver).filter(Boolean) as Driver[];
  const selectedTeamObject = selectedTeam ? getTeam(selectedTeam) : null;
  const reserveDriverObject = reserveDriver ? getDriver(reserveDriver) : null;

  const driversCost = selectedDriverObjects.reduce((acc, d) => acc + d.price, 0);
  const teamCost = selectedTeamObject?.price || 0;
  const reserveCost = reserveDriverObject?.price || 0;

  const totalCost = driversCost + teamCost + reserveCost;
  const budget = (user?.budget || 100) + (user?.bonusBudget || 0);
  const budgetRemaining = budget - totalCost;

  // Reserve driver rule
  const cheapestSelectedDriverPrice = selectedDriverObjects.length > 0 ? Math.min(...selectedDriverObjects.map(d => d.price)) : Infinity;
  const isReserveValid = !reserveDriverObject || reserveDriverObject.price < cheapestSelectedDriverPrice;

  const toggleDriver = (id: string) => {
    if (isLocked) return;
    if (selectedDrivers.includes(id)) {
      setSelectedDrivers(selectedDrivers.filter(d => d !== id));
      if (reserveDriver === id) setReserveDriver(null);
    } else {
      if (selectedDrivers.length < 3) {
        setSelectedDrivers([...selectedDrivers, id]);
      } else {
        toast({ title: "Limite Atingido", description: "Você só pode selecionar 3 pilotos titulares.", variant: "destructive" });
      }
    }
  };

  const toggleTeam = (id: string) => {
    if (isLocked) return;
    setSelectedTeam(selectedTeam === id ? null : id);
  };

  const toggleReserve = (id: string) => {
    if (isLocked) return;
    if (selectedDrivers.includes(id)) {
      toast({ title: "Piloto já titular", description: "O piloto reserva não pode ser um titular.", variant: "destructive" });
      return;
    }
    
    const driver = getDriver(id);
    if (!driver) return;

    if (selectedDriverObjects.length > 0 && driver.price >= cheapestSelectedDriverPrice) {
       toast({ title: "Preço Inválido", description: "O piloto reserva deve ser mais barato que o seu piloto titular mais barato.", variant: "destructive" });
       return;
    }

    setReserveDriver(reserveDriver === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Draft: {gp.name}</h1>
          <p className="text-muted-foreground">{gp.circuitName}</p>
        </div>
        {isLocked && (
          <div className="bg-destructive/20 text-destructive px-4 py-2 rounded-lg font-bold flex items-center gap-2 uppercase tracking-wider">
            <AlertCircle className="h-5 w-5" /> Mercado Fechado
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Pilotos Titulares (3)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...activeDrivers].sort((a, b) => b.price - a.price).map(driver => (
                  <div 
                    key={driver.id} 
                    onClick={() => toggleDriver(driver.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors flex justify-between items-center ${selectedDrivers.includes(driver.id) ? 'bg-primary/20 border-primary' : 'bg-secondary/30 border-border hover:border-primary/50'} ${reserveDriver === driver.id ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div>
                      <p className="font-bold">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">{driver.constructorTeamName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${driver.price.toFixed(1)}M</p>
                      {driver.priceChange !== undefined && driver.priceChange !== 0 && (
                        <p className={`text-xs flex items-center gap-1 ${driver.priceChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {driver.priceChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(driver.priceChange).toFixed(1)}M
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-dashed border-primary/50">
            <CardHeader>
              <CardTitle>Piloto Reserva (Opcional)</CardTitle>
              <p className="text-sm text-muted-foreground">Deve custar menos que o seu piloto titular mais barato (${cheapestSelectedDriverPrice === Infinity ? '-' : cheapestSelectedDriverPrice.toFixed(1)}M).</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...activeDrivers].sort((a, b) => b.price - a.price).map(driver => {
                  const isValidReserve = driver.price < cheapestSelectedDriverPrice;
                  const isSelectedAsTitular = selectedDrivers.includes(driver.id);
                  const isSelectedAsReserve = reserveDriver === driver.id;

                  return (
                    <div 
                      key={`res-${driver.id}`} 
                      onClick={() => !isSelectedAsTitular && isValidReserve && toggleReserve(driver.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors flex justify-between items-center 
                        ${isSelectedAsReserve ? 'bg-primary/20 border-primary' : 'bg-secondary/30 border-border'} 
                        ${(isSelectedAsTitular || !isValidReserve) && !isSelectedAsReserve ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary/50'}
                      `}
                    >
                      <div>
                        <p className="font-bold flex items-center gap-2">{driver.name} {isSelectedAsReserve && <Shield className="h-4 w-4 text-primary" />}</p>
                      </div>
                      <p className="font-bold">${driver.price.toFixed(1)}M</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Construtor (1)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...activeTeams].sort((a, b) => b.price - a.price).map(team => (
                  <div 
                    key={team.id} 
                    onClick={() => toggleTeam(team.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors flex justify-between items-center ${selectedTeam === team.id ? 'bg-primary/20 border-primary' : 'bg-secondary/30 border-border hover:border-primary/50'}`}
                  >
                    <div>
                      <p className="font-bold flex items-center gap-2">
                        {team.color && <span className="w-3 h-3 rounded-full" style={{backgroundColor: team.color}}></span>}
                        {team.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${team.price.toFixed(1)}M</p>
                      {team.priceChange !== undefined && team.priceChange !== 0 && (
                        <p className={`text-xs flex items-center gap-1 ${team.priceChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {team.priceChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(team.priceChange).toFixed(1)}M
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="bg-card border-primary/30">
              <CardHeader className="bg-secondary/30 border-b border-border">
                <CardTitle className="uppercase italic tracking-tighter">Sua Seleção</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Pilotos</p>
                  {[0, 1, 2].map(i => {
                    const d = selectedDriverObjects[i];
                    return d ? (
                      <div key={i} className="flex justify-between items-center p-2 bg-secondary/50 rounded text-sm">
                        <span className="font-bold">{d.shortName || d.name}</span>
                        <span>${d.price.toFixed(1)}M</span>
                      </div>
                    ) : (
                      <div key={i} className="flex justify-between items-center p-2 border border-dashed border-border rounded text-sm text-muted-foreground">
                        <span>Selecionar Piloto</span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">Reserva <Shield className="h-3 w-3"/></p>
                  {reserveDriverObject ? (
                    <div className="flex justify-between items-center p-2 bg-secondary/50 rounded text-sm">
                      <span className="font-bold">{reserveDriverObject.shortName || reserveDriverObject.name}</span>
                      <span>${reserveDriverObject.price.toFixed(1)}M</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center p-2 border border-dashed border-border rounded text-sm text-muted-foreground">
                      <span>Nenhum reserva</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Construtor</p>
                  {selectedTeamObject ? (
                    <div className="flex justify-between items-center p-2 bg-secondary/50 rounded text-sm">
                      <span className="font-bold">{selectedTeamObject.name}</span>
                      <span>${selectedTeamObject.price.toFixed(1)}M</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center p-2 border border-dashed border-border rounded text-sm text-muted-foreground">
                      <span>Selecionar Equipe</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold">Orçamento Total</span>
                    <span className="font-black text-lg">${budget.toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">Custo da Equipe</span>
                    <span className="font-black text-lg text-primary">${totalCost.toFixed(1)}M</span>
                  </div>
                  <div className={`flex justify-between items-center mt-2 p-2 rounded ${budgetRemaining < 0 ? 'bg-destructive/20 text-destructive' : 'bg-green-500/10 text-green-500'}`}>
                    <span className="text-sm font-bold">Saldo Restante</span>
                    <span className="font-black text-lg">${budgetRemaining.toFixed(1)}M</span>
                  </div>
                </div>

                <Button 
                  className="w-full uppercase font-bold italic tracking-wider h-12" 
                  onClick={handleSave}
                  disabled={isLocked || budgetRemaining < 0 || saveDraftMutation.isPending || selectedDrivers.length !== 3 || !selectedTeam || !isReserveValid}
                >
                  {saveDraftMutation.isPending ? 'Salvando...' : 'Confirmar Equipe'}
                </Button>
              </CardContent>
            </Card>

            {isLocked && gp.status !== 'upcoming' && (
              <Link href={`/draft/${gp.id}/results`}>
                <Button variant="outline" className="w-full uppercase font-bold italic tracking-wider">
                  Ver Resultados do Draft
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
