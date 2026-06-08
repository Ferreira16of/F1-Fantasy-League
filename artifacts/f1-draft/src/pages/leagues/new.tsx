import { useCreateLeague, useGetCurrentSeason, getGetCurrentSeasonQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export default function NewLeague() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: currentSeason } = useGetCurrentSeason({
    query: { queryKey: getGetCurrentSeasonQueryKey() }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });

  const createLeague = useCreateLeague();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!currentSeason) {
      toast({ title: "Erro", description: "Temporada atual não encontrada.", variant: "destructive" });
      return;
    }

    createLeague.mutate({
      data: {
        ...values,
        seasonId: currentSeason.id,
      }
    }, {
      onSuccess: (league) => {
        toast({ title: "Liga criada com sucesso!" });
        queryClient.invalidateQueries();
        setLocation(`/leagues/${league.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Erro ao criar liga", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leagues">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Criar Nova Liga</h1>
      </div>

      <Card className="bg-card">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Liga</FormLabel>
                    <FormControl>
                      <Input placeholder="Minha Liga Incrível" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Regras, prêmios ou apenas zoeira..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Liga Pública</FormLabel>
                      <FormDescription>
                        Qualquer pessoa poderá encontrar e entrar na sua liga. Se desmarcado, apenas pessoas com o link de convite poderão entrar.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full uppercase font-bold italic tracking-wider h-12" disabled={createLeague.isPending || !currentSeason}>
                {createLeague.isPending ? "Criando..." : "Criar Liga"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
