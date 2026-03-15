import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/context/UserContext";
import { Building2, Download, ArrowLeftRight, ChevronRight, LifeBuoy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { BankTransferStep } from "./bank-transfer-step";
import { CryptoStep } from "./crypto-step";
import { useDebridgeUrl } from "@/hooks/useDebridgeUrl";
import { useJumperUrl } from "@/hooks/useJumperUrl";
import { currencies } from "@/constants";

interface AddFundsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

enum Step {
  Select = "Adicionar fundos",
  IBAN = "Transferência bancária",
  Crypto = "Adicionar com cripto",
}

export const AddFundsModal = ({ open, onOpenChange }: AddFundsModalProps) => {
  const { user, safeConfig } = useUser();
  const currency = useMemo(() => {
    if (!safeConfig?.fiatSymbol) return null;
    return currencies[safeConfig.fiatSymbol];
  }, [safeConfig]);
  const [step, setStep] = useState<Step>(Step.Select);
  const onLocalOpenChange = useCallback(
    (open: boolean) => {
      setStep(Step.Select);
      onOpenChange(open);
    },
    [onOpenChange],
  );

  const debridgeUrl = useDebridgeUrl();
  const jumperUrl = useJumperUrl();

  const fundingOptions = useMemo(() => {
    const baseOptions = [
      {
        icon: Download,
        title: "Adicionar com cripto",
        description: "Envie cripto para sua conta Gnosis Card • ~5 min",
        onClick: () => {
          setStep(Step.Crypto);
        },
      },
      {
        icon: ArrowLeftRight,
        title: "Trocar tokens via Jumper",
        description: `Troque sua cripto por ${currency?.tokenSymbol} • ~5 min`,
        onClick: () => {
          if (!jumperUrl) return;
          window.open(jumperUrl, "_blank");
        },
      },
      {
        icon: ArrowLeftRight,
        title: "Trocar tokens via deBridge",
        description: `Troque sua cripto por ${currency?.tokenSymbol} • ~5 min`,
        onClick: () => {
          if (!debridgeUrl) return;
          window.open(debridgeUrl, "_blank");
        },
      },
    ];

    // Add bank transfer option if user has banking details
    if (user?.bankingDetails?.moneriumIban) {
      baseOptions.push({
        icon: Building2,
        title: "Transferência bancária",
        description: "Envie Euros da sua conta bancária • Até 1 dia",
        onClick: () => {
          setStep(Step.IBAN);
        },
      });
    }

    return baseOptions;
  }, [user?.bankingDetails?.moneriumIban, debridgeUrl, jumperUrl, currency?.tokenSymbol]);

  return (
    <Dialog open={open} onOpenChange={onLocalOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{step}</DialogTitle>
        <div className="pb-6 space-y-3">
          {step === Step.Select && (
            <>
              {fundingOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.title}
                    type="button"
                    className="cursor-pointer w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    onClick={option.onClick}
                  >
                    <div className="flex-shrink-0">
                      <IconComponent className="h-6 w-6 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground mb-1">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
              <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                <LifeBuoy className="h-4 w-4" />
                <span>
                  Mais informações sobre bridge e swap em nossa{" "}
                  <a
                    href="https://help.gnosispay.com/hc/en-us/articles/39563426086932-Funding-with-Cryptocurrency-Swapping-Bridging"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline"
                  >
                    central de ajuda
                  </a>
                  .
                </span>
              </div>
            </>
          )}
          {step === Step.IBAN && <BankTransferStep onBack={() => setStep(Step.Select)} />}
          {step === Step.Crypto && <CryptoStep onBack={() => setStep(Step.Select)} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};
