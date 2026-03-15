import { StandardAlert } from "@/components/ui/standard-alert";
import { Button } from "@/components/ui/button";
import { ADD_FUNDS_CONSTANTS } from "@/constants";
import { useUser } from "@/context/UserContext";
import { useIBAN } from "@/context/IBANContext";
import { useUserFullName } from "@/hooks/useUserFullName";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Copy, InboxIcon } from "lucide-react";
import { IbanIntegrationFlow } from "@/components/iban/iban-integration-flow";
import { useState } from "react";

export const IbanAccountDetails = () => {
  const { user, safeConfig } = useUser();
  const { hasIbanSet, isEligibleForIban } = useIBAN();
  const fullName = useUserFullName();
  const { copyToClipboard } = useCopyToClipboard();
  const [isSuccessIbanIntegration, setIsSuccessIbanIntegration] = useState(false);

  const handleCopyBeneficiary = () => {
    copyToClipboard(fullName, {
      successMessage: "Nome do beneficiário copiado para a área de transferência",
      errorMessage: "Falha ao copiar nome do beneficiário",
    });
  };

  const handleCopyIban = () => {
    const iban = user?.bankingDetails?.moneriumIban || "";
    copyToClipboard(iban, {
      successMessage: "IBAN copiado para a área de transferência",
      errorMessage: "Falha ao copiar IBAN",
    });
  };

  const handleCopyBic = () => {
    const bic = user?.bankingDetails?.moneriumBic || "";
    copyToClipboard(bic, {
      successMessage: "BIC copiado para a área de transferência",
      errorMessage: "Falha ao copiar BIC",
    });
  };

  const handleCopyAddress = () => {
    const address = user?.bankingDetails?.address || "";
    copyToClipboard(address, {
      successMessage: "Endereço copiado para a área de transferência",
      errorMessage: "Falha ao copiar endereço",
    });
  };

  // If user is eligible for IBAN but doesn't have one yet, show integration flow
  if (isEligibleForIban && !hasIbanSet) {
    return (
      <div className="space-y-4">
        {!isSuccessIbanIntegration && (
          <div className="text-center text-muted-foreground mb-4">
            Crie um IBAN para receber transferências bancárias diretamente na sua conta.
          </div>
        )}
        <IbanIntegrationFlow showCancelButton={false} onSuccess={() => setIsSuccessIbanIntegration(true)} />
      </div>
    );
  }

  // If user is not eligible for IBAN
  if (!isEligibleForIban && !hasIbanSet) {
    return (
      <div className="flex flex-col items-center justify-center mt-4">
        <InboxIcon className="w-10 h-10 mb-2 text-secondary" />
        <div className="text-center text-secondary">Nenhum IBAN disponível para esta conta</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Endereço vinculado</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted/50 rounded-lg font-medium text-foreground text-sm">
              {user?.bankingDetails?.address || "N/D"}
            </div>
            {user?.bankingDetails?.address && (
              <Button variant="outline" size="sm" onClick={handleCopyAddress} className="p-2 flex-shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">Beneficiário</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted/50 rounded-lg font-medium text-foreground">{fullName}</div>
            {fullName && (
              <Button variant="outline" size="sm" onClick={handleCopyBeneficiary} className="p-2 flex-shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">IBAN</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted/50 rounded-lg font-mono text-foreground">
              {user?.bankingDetails?.moneriumIban || "N/D"}
            </div>
            {user?.bankingDetails?.moneriumIban && (
              <Button variant="outline" size="sm" onClick={handleCopyIban} className="p-2 flex-shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">BIC</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted/50 rounded-lg font-mono text-foreground">
              {user?.bankingDetails?.moneriumBic || "N/D"}
            </div>
            {user?.bankingDetails?.moneriumBic && (
              <Button variant="outline" size="sm" onClick={handleCopyBic} className="p-2 flex-shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <StandardAlert variant="warning" description="O banco da contraparte pode cobrar por pagamentos internacionais." />

        <StandardAlert
          variant="info"
          description={`Todas as transferências passam pelo SEPA Instant. O SEPA Standard é usado quando o banco da contraparte não suporta SEPA Instant ou o valor excede 100.000 ${safeConfig?.fiatSymbol}.`}
        />

        <StandardAlert variant="info" description="Transferências SEPA podem levar até um dia útil." />

        <StandardAlert
          variant="info"
          description={
            <>
              O IBAN e os serviços relacionados são fornecidos pela Monerium EMI ehf., uma instituição de moeda eletrônica terceirizada{" "}
              <a
                href={ADD_FUNDS_CONSTANTS.MONERIUM_AUTHORISED_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                autorizada pela Autoridade de Supervisão Financeira do Banco Central da Islândia.
              </a>
            </>
          }
        />
      </div>
    </>
  );
};
