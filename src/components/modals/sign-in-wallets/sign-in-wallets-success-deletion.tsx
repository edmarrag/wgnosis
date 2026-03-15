import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface SignInWalletsSuccessDeletionProps {
  onBack: () => void;
}

export const SignInWalletsSuccessDeletion = ({ onBack }: SignInWalletsSuccessDeletionProps) => {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="w-16 h-16 text-success" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Carteira excluída</h3>
        <p className="text-sm text-muted-foreground">
          O endereço de carteira foi removido da sua conta com sucesso.
        </p>
      </div>

      <Button className="w-full bg-button-bg hover:bg-button-bg-hover text-button-black font-medium" onClick={onBack}>
        Voltar para carteiras
      </Button>
    </div>
  );
};
