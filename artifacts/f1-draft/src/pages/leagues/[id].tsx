import { useParams, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useGetLeague, 
  getGetLeagueQueryKey, 
  useGetLeagueRankings, 
  getGetLeagueRankingsQueryKey,
  useGetLeagueMembers,
  getGetLeagueMembersQueryKey,
  useLeaveLeague,
  useKickLeagueMember,
  useDeleteLeague
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Shield, Copy, Check, ChevronLeft, LogOut, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function LeagueDetail() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [copied, setCopied] = useState(false);

  const { data: league, isLoading: leagueLoading } = useGetLeague(id, {
    query: { queryKey: getGetLeagueQueryKey(id), enabled: !!id }
  });

  const { data: standings } = useGetLeagueRankings(id, {
    query: { queryKey: getGetLeagueRankingsQueryKey(id), enabled: !!id }
  });

  const { data: members } = useGetLeagueMembers(id, {
    query: { queryKey: getGetLeagueMembersQueryKey(id), enabled: !!id }
  });

  const leaveLeague = useLeaveLeague();
  const deleteLeague = useDeleteLeague();
  const kickMember = useKickLeagueMember();

  const isOwner = user?.id === league?.ownerId;

  const copyInvite = () => {
    if (!league?.inviteCode) return;
    const url = `${window.location.origin}/leagues/join/${league.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    if (!confirm("Tem certeza que deseja sair desta liga?")) return;
    leaveLeague.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Você saiu da liga." });
        setLocation("/leagues");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Tem certeza que deseja DELETAR esta liga? Esta ação não pode ser desfeita.")) return;
    deleteLeague.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Liga deletada." });
        setLocation("/leagues");
      }
    });
  };

  const handleKick = (userId: string) => {
    if (!confirm("Remover este membro da liga?")) return;
    kickMember.mutate({ id, userId }, {
      onSuccess: () => {
        toast({ title: "Membro removido." });
        queryClient.invalidateQueries({ queryKey: getGetLeagueMembersQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetLeagueRankingsQueryKey(id) });
      }
    });
  };

  if (leagueLoading) return <div className="p-8 text-center">Carregando...</div>;
  if (!league) return <div className="p-8 text-center">Liga não encontrada.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leagues">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">{league.name}</h1>
            {league.isFactory && <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-bold tracking-wider">OFICIAL</span>}
          </div>
          {league.description && <p className="text-muted-foreground mt-1">{league.description}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="standings" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="standings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 font-bold uppercase tracking-wider">
                <Trophy className="h-4 w-4 mr-2" /> Classificação
              </TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 font-bold uppercase tracking-wider">
                <Users className="h-4 w-4 mr-2" /> Membros ({league.memberCount})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="standings" className="mt-6">
              <Card className="bg-card">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {standings?.entries.map((entry) => (
                      <div key={entry.userId} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
                        <div className="w-8 text-center font-bold text-muted-foreground text-lg">
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
                    {!standings?.entries.length && (
                      <div className="p-8 text-center text-muted-foreground">Nenhuma pontuação registrada.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="members" className="mt-6">
              <Card className="bg-card">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {members?.map((member) => (
                      <div key={member.userId} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold flex items-center gap-2">
                              {member.displayName}
                              {member.isOwner && <Shield className="h-3 w-3 text-primary" />}
                            </p>
                            <p className="text-xs text-muted-foreground">@{member.handle}</p>
                          </div>
                        </div>
                        {isOwner && member.userId !== user?.id && !league.isFactory && (
                          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleKick(member.userId)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {!league.isPublic && !league.isFactory && (
            <Card className="bg-card border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Link de Convite</CardTitle>
                <CardDescription>Envie este link para convidar amigos para sua liga privada.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input readOnly value={`${window.location.origin}/leagues/join/${league.inviteCode}`} className="bg-secondary/50 font-mono text-xs" />
                  <Button size="icon" variant="secondary" onClick={copyInvite}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gerenciar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isOwner && !league.isFactory && (
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={handleLeave} disabled={leaveLeague.isPending}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair da Liga
                </Button>
              )}
              {isOwner && !league.isFactory && (
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleteLeague.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" /> Deletar Liga
                </Button>
              )}
              {league.isFactory && (
                <p className="text-sm text-muted-foreground text-center">Você não pode sair de ligas oficiais.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
