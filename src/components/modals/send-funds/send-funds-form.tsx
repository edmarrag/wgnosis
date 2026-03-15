import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StandardAlert } from "@/components/ui/standard-alert";
import { Switch } from "@/components/ui/switch";
import { Coins } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { isAddress } from "viem";
import type { TokenInfoWithBalance } from "@/hooks/useTokenBalance";
import { TokenAmountInput } from "./token-amount-input";
import { CustomTokenAmountInput } from "./custom-token-amount-input.tsx";
import { AddressInput } from "./address-input";
import { useAccount } from "wagmi";
import { useDelayRelay } from "@/context/DelayRelayContext";
import { QueueNotEmptyAlert } from "@/components/QueueNotEmptyAlert";
import { useSafeSignerVerification } from "@/hooks/useSafeSignerVerification";

interface ValidatedFormData {
  toAddress: string;
  selectedToken: TokenInfoWithBalance;
  amount: bigint;
}

interface SendFundsFormProps {
  onNext: (data: ValidatedFormData) => void;
}

export const SendFundsForm = ({ onNext }: SendFundsFormProps) => {
  const { address: connectedAddress } = useAccount();
  const { queue } = useDelayRelay();
  const isQueueNotEmpty = useMemo(() => queue.length > 0, [queue]);
  const [toAddress, setToAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenInfoWithBalance | undefined>();
  const [amount, setAmount] = useState<bigint>(0n);
  const [amountError, setAmountError] = useState("");
  const [isCustomToken, setIsCustomToken] = useState(false);
  const { isSignerConnected, signerError, isDataLoading } = useSafeSignerVerification();

  const handleAddressChange = useCallback((value: string) => {
    setAddressError("");
    setToAddress(value);

    if (value && !isAddress(value)) {
      setAddressError("Endereço inválido");
    }
  }, []);

  // Reset form state when switching between token modes
  const handleCustomTokenChange = useCallback((checked: boolean) => {
    setIsCustomToken(checked);
    setSelectedToken(undefined);
    setAmount(0n);
    setAmountError("");
  }, []);

  const isFormValid = useMemo(() => {
    return !!(toAddress && amount && amount > 0n && selectedToken && !amountError && !addressError && !signerError);
  }, [toAddress, addressError, amount, selectedToken, amountError, signerError]);

  const handleNext = useCallback(() => {
    if (!isFormValid || !selectedToken || !isSignerConnected) return;

    onNext({
      toAddress,
      selectedToken,
      amount,
    });
  }, [isFormValid, selectedToken, toAddress, amount, onNext, isSignerConnected]);

  return (
    <div className="space-y-6">
      {isQueueNotEmpty && <QueueNotEmptyAlert />}

      {signerError && <StandardAlert variant="destructive" description={signerError.message} />}

      {!isSignerConnected && !isDataLoading && (
        <StandardAlert
          variant="destructive"
          description="Você deve estar conectado com uma conta que seja assinante da conta Gnosis Pay"
        />
      )}

      {!isQueueNotEmpty && (
        <StandardAlert
          variant="warning"
          description="Certifique-se de inserir um endereço da Gnosis Chain. Você é o único responsável pela precisão do endereço e pela segurança de seus fundos."
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="to-address">Para</Label>
        <AddressInput
          toAddress={toAddress}
          onChange={handleAddressChange}
          error={addressError}
          connectedAddress={connectedAddress}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Label htmlFor="custom-token-switch" className="text-sm text-muted-foreground">
              Token personalizado
            </Label>
            <Switch
              id="custom-token-switch"
              checked={isCustomToken}
              onCheckedChange={handleCustomTokenChange}
              data-testid="custom-token-switch"
            />
          </div>
        </div>

        {isCustomToken ? (
          <CustomTokenAmountInput
            onTokenChange={setSelectedToken}
            onAmountChange={setAmount}
            setError={setAmountError}
          />
        ) : (
          <TokenAmountInput onTokenChange={setSelectedToken} onAmountChange={setAmount} setError={setAmountError} />
        )}

        {amountError && (
          <StandardAlert variant="destructive" description={amountError} customIcon={<Coins className="h-4 w-4" />} />
        )}
      </div>

      <Button
        onClick={handleNext}
        disabled={!isFormValid || isQueueNotEmpty || !isSignerConnected}
        className="w-full"
        data-testid="send-funds-next-button"
      >
        Avançar
      </Button>
    </div>
  );
};
