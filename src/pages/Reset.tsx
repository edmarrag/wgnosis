import { deleteApiV1SafeReset } from "@/client";
import { StandardAlert } from "@/components/ui/standard-alert";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/utils/errorHelpers";
import { useCallback, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useNavigate } from "react-router-dom";

enum ResetStep {
  Init = "init",
  Success = "success",
}

export const ResetRoute = () => {
  const [step, setStep] = useState<ResetStep>(ResetStep.Init);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshUser } = useUser();
  const navigate = useNavigate();

  const handleReset = useCallback(() => {
    setError("");
    setIsProcessing(true);

    deleteApiV1SafeReset()
      .then(({ error: resetError }) => {
        if (resetError) {
          setError(extractErrorMessage(resetError, "Falha ao resetar a conta Safe"));
          setIsProcessing(false);
          return;
        }

        setStep(ResetStep.Success);
        setIsProcessing(false);
        refreshUser();
      })
      .catch((err) => {
        setError(extractErrorMessage(err, "Falha ao resetar a conta Safe"));
        setIsProcessing(false);
      });
  }, [refreshUser]);

  return (
    <div className="grid grid-cols-6 gap-4 h-full" data-testid="reset-page">
      {error && (
        <div className="col-span-6 lg:col-start-2 lg:col-span-4 mx-4 lg:mx-0">
          <StandardAlert
            variant="destructive"
            title="Erro"
            description={error}
            className="mt-4"
            data-testid="reset-error-alert"
          />
        </div>
      )}
      {step === ResetStep.Init && (
        <div className="col-span-6 lg:col-start-2 lg:col-span-4 mx-4 lg:mx-0" data-testid="reset-warning-step">
          <div className="space-y-6 mt-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-16 h-16 text-warning" data-testid="reset-warning-icon" />
            </div>
            <div className="space-y-4 text-center">
              <h2 className="text-lg font-semibold text-foreground">Resetar conta Safe</h2>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Esta ação excluirá permanentemente sua conta Safe. Esta operação é <strong>irreversível</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Transfira quaisquer fundos remanescentes da sua conta Safe antes de continuar.
                </p>
                <p className="text-sm text-muted-foreground">
                  Certifique-se de que está certo desta ação antes de prosseguir.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="destructive"
                onClick={handleReset}
                loading={isProcessing}
                disabled={isProcessing || !!error}
                data-testid="reset-confirm-button"
              >
                Resetar conta Safe
              </Button>
            </div>
          </div>
        </div>
      )}
      {step === ResetStep.Success && (
        <div className="col-span-6 lg:col-start-2 lg:col-span-4 mx-4 lg:mx-0" data-testid="reset-success-step">
          <div className="flex flex-col items-center justify-center h-full space-y-4 mt-4">
            <CheckCircle2 className="w-16 h-16 text-success" data-testid="reset-success-icon" />
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold text-foreground">Conta Safe redefinida com sucesso</h3>
              <p className="text-sm text-muted-foreground" data-testid="reset-success-message">
                Sua conta Safe foi excluída permanentemente. Você pode criar uma nova conta Safe, se necessário.
              </p>
              <Button onClick={() => navigate("/")}>Ir para a página inicial</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
