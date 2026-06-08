import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListFriends, useListFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useRejectFriendRequest, useRemoveFriend, getListFriendsQueryKey, getListFriendRequestsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, UserX, Check, X, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Friends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [handle, setHandle] = useState("");

  const { data: friends } = useListFriends({
    query: { queryKey: getListFriendsQueryKey() }
  });

  const { data: requests } = useListFriendRequests({
    query: { queryKey: getListFriendRequestsQueryKey() }
  });

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle) return;
    
    sendRequest.mutate({ data: { handle: handle.replace('@', '') } }, {
      onSuccess: () => {
        setHandle("");
        toast({ title: "Pedido enviado!" });
      },
      onError: (err: any) => {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleAccept = (id: string) => {
    acceptRequest.mutate({ requestId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFriendsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
        toast({ title: "Pedido aceito!" });
      }
    });
  };

  const handleReject = (id: string) => {
    rejectRequest.mutate({ requestId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
      }
    });
  };

  const handleRemove = (friendHandle: string, userId: string) => {
    if (!confirm("Tem certeza?")) return;
    removeFriend.mutate({ userId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFriendsQueryKey() });
        toast({ title: "Amigo removido." });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Amigos</h1>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Adicionar Amigo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por @handle..." 
                className="pl-9"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!handle || sendRequest.isPending}>
              <UserPlus className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {requests && requests.length > 0 && (
        <Card className="bg-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Pedidos Pendentes ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                      {req.fromDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold">{req.fromDisplayName}</p>
                      <p className="text-xs text-muted-foreground">@{req.fromHandle}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => handleAccept(req.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleReject(req.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Meus Amigos ({friends?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {friends?.map(friend => (
              <div key={friend.userId} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold">
                    {friend.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold">{friend.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{friend.handle}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(friend.handle, friend.userId)}>
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!friends?.length && (
              <div className="p-8 text-center text-muted-foreground">
                Você ainda não adicionou nenhum amigo.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
