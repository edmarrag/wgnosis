import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface SignInWalletsSuccessAdditionProps {
  onBack: () => void;
}

export const SignInWalletsSuccessAddition = ({ onBack }: SignInWalletsSuccessAdditionProps) => {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="w-16 h-16 text-success" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Sucesso</h3>
        <p className="text-sm text-muted-foreground">
          Seu endereço de carteira foi adicionado com sucesso. Você já pode usá-lo para fazer login na sua conta.
        </p>
      </div>

      <Button className="w-full bg-button-bg hover:bg-button-bg-hover text-button-black font-medium" onClick={onBack}>
        Voltar para carteiras
      </Button>
    </div>
  );
};
