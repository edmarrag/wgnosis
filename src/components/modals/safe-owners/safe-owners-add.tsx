import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StandardAlert } from "@/components/ui/standard-alert";
import { Checkbox } from "@/components/ui/checkbox";
import { getApiV1OwnersAddTransactionData, postApiV1EoaAccounts, postApiV1Owners } from "@/client";
import { useUser } from "@/context/UserContext";
import { useSignTypedData } from "wagmi";
import { type Address, isAddress } from "viem";
import { extractErrorMessage } from "@/utils/errorHelpers";
import { toast } from "sonner";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { useDelayRelay } from "@/context/DelayRelayContext";
import { useSafeSignerVerification } from "@/hooks/useSafeSignerVerification";

interface SafeOwnersAddProps {
  onCancel: () => void;
  onSuccess: () => void;
  currentOwners: string[];
}

export const SafeOwnersAdd = ({ onCancel, onSuccess, currentOwners }: SafeOwnersAddProps) => {
  const { safeConfig } = useUser();
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addAsSignInWallet, setAddAsSignInWallet] = useState(true);
  const { signTypedDataAsync } = useSignTypedData();
  const { smartWalletAddress, isLoading: isSmartWalletLoading } = useSmartWallet();
  const { fetchDelayQueue } = useDelayRelay();
  const { isSignerConnected, signerError, isDataLoading } = useSafeSignerVerification();
  const handleAddressChange = useCallback((value: string) => {
    setError(null);
    setNewOwnerAddress(value);
  }, []);

  const handleSave = useCallback(async () => {
    if (currentOwners.includes(newOwnerAddress)) {
      setError("O proprietário já existe");
      return;
    }

    if (!safeConfig?.address) {
      setError("Configuração do Safe não encontrada");
      return;
    }

    if (isSmartWalletLoading) {
      setError("Carteira inteligente carregando");
      return;
    }

    const trimmedAddress = newOwnerAddress.trim();

    if (!trimmedAddress) {
      setError("Insira um endereço de proprietário");
      return;
    }

    if (!isAddress(trimmedAddress)) {
      setError("Insira um endereço de carteira válido");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Get transaction data to sign
      const { error: transactionError, data: transactionData } = await getApiV1OwnersAddTransactionData({
        query: {
          newOwner: trimmedAddress,
        },
      });

      if (transactionError) {
        setError(extractErrorMessage(transactionError, "Falha ao criar transação"));
        return;
      }

      if (!transactionData?.data) {
        setError("Nenhum dado de transação recebido");
        return;
      }

      // Step 2: Sign the typed data
      const signature = await signTypedDataAsync({
        ...transactionData.data,
        domain: {
          ...transactionData.data.domain,
          verifyingContract: transactionData.data.domain.verifyingContract as Address,
        },
      });

      if (!signature) {
        setError("Falha ao assinar a transação");
        return;
      }

      // Step 3: Submit the signed transaction
      const { error: postError } = await postApiV1Owners({
        body: {
          newOwner: trimmedAddress,
          signature,
          message: transactionData.data.message,
          smartWalletAddress,
        },
      });

      if (postError) {
        setError(extractErrorMessage(postError, "Falha ao adicionar proprietário"));
        return;
      }

      // Conditionally add as a Sign-in Wallet if checkbox is checked
      if (addAsSignInWallet) {
        postApiV1EoaAccounts({
          body: {
            address: trimmedAddress,
          },
        })
          .then((response) => {
            if (response.error) {
              setError(extractErrorMessage(response.error, "Falha ao adicionar endereço de carteira"));
              return;
            }

            toast.success("Carteira de login adicionada com sucesso");
          })
          .catch((err) => {
            console.error("Error adding Sign In Wallet account:", err);
            setError("Falha ao adicionar endereço de carteira");
          });
      }

      toast.success("Adição de proprietário enfileirada com sucesso");
      fetchDelayQueue();
      onSuccess();
    } catch (err) {
      console.error("Error adding owner:", err);
      setError("Falha ao adicionar proprietário");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    newOwnerAddress,
    safeConfig?.address,
    signTypedDataAsync,
    onSuccess,
    currentOwners,
    smartWalletAddress,
    isSmartWalletLoading,
    addAsSignInWallet,
    fetchDelayQueue,
  ]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleAddressChange(e.target.value);
    },
    [handleAddressChange],
  );

  return (
    <div className="space-y-6">
      {!isSignerConnected && !isDataLoading && (
        <StandardAlert
          variant="destructive"
          description="Você deve estar conectado com uma conta que seja assinante da conta Gnosis Pay"
        />
      )}

      <div className="space-y-2">
        <label htmlFor="owner-address" className="text-sm text-muted-foreground">
          Endereço do proprietário
        </label>
        <Input
          id="owner-address"
          type="text"
          value={newOwnerAddress}
          onChange={onChange}
          placeholder="0x..."
          className="font-mono"
        />
        <div className="text-xs text-muted-foreground">
          Insira um endereço de carteira válido que se tornará um novo proprietário do seu Safe
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="add-signin-wallet"
          checked={addAsSignInWallet}
          onCheckedChange={(checked: boolean) => setAddAsSignInWallet(checked === true)}
          disabled={isSubmitting}
        />
        <label htmlFor="add-signin-wallet" className="text-sm text-foreground leading-none cursor-pointer select-none">
          Adicionar este endereço como carteira de login
        </label>
      </div>

      <StandardAlert
        variant="warning"
        title="Aviso de segurança"
        description="O novo proprietário terá acesso total a todos os fundos e ativos deste Safe. Ele poderá assinar transações, gerenciar o Safe e controlar todos os ativos digitais. Adicione apenas endereços confiáveis como proprietários."
      />

      {error && <StandardAlert variant="destructive" title="Erro" description={error} />}
      {signerError && <StandardAlert variant="destructive" description={signerError.message} />}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-button-bg hover:bg-button-bg-hover text-button-black font-medium"
          onClick={handleSave}
          disabled={isSubmitting || !newOwnerAddress.trim() || !isSignerConnected || !!signerError}
          loading={isSubmitting}
        >
          {isSubmitting ? "Adicionando..." : "Adicionar proprietário"}
        </Button>
      </div>
    </div>
  );
};
