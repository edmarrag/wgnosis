import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type GPSDK from "@gnosispay/pse-sdk";
import { ElementType, Action } from "@gnosispay/pse-sdk";
import { useGpSdk } from "@/hooks/useGpSdk";
import { StandardAlert } from "../ui/standard-alert";
import { useCards } from "@/context/CardsContext";
import { useTheme } from "@/context/ThemeContext";

interface SetPinStepProps {
  cardToken: string | null;
  onBack: () => void;
}

export const SetPinStep = ({ cardToken }: SetPinStepProps) => {
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const { refreshCards } = useCards();
  const iframeId = useMemo(() => `pse-setpin-new-card-${cardToken}`, [cardToken]);
  const pinInputIframeRef = useRef<ReturnType<GPSDK["init"]> | null>(null);
  const { getGpSdk } = useGpSdk();
  const [error, setError] = useState<string | null>(null);

  const actionCallback = useCallback(
    (action?: Action) => {
      if (action === Action.DoneSettingPin) {
        pinInputIframeRef.current?.destroy();
        refreshCards();
        navigate("/cards");
      }
    },
    [navigate, refreshCards],
  );

  const showPinIframe = useCallback(
    async (cardToken: string) => {
      try {
        const gpSdk = await getGpSdk({ actionCallback });
        if (!gpSdk) {
          const errorMessage = "PSE SDK não inicializado";
          console.error(errorMessage);
          setError(errorMessage);
          return;
        }

        const sp = gpSdk.init(ElementType.SetCardPin, `#${iframeId}`, {
          cardToken,
        });

        pinInputIframeRef.current = sp;
      } catch (error) {
        console.error("Error initializing PIN iframe:", error);
        setError("Falha ao inicializar a definição de PIN");
      }
    },
    [getGpSdk, iframeId, actionCallback],
  );

  useEffect(() => {
    if (!cardToken) {
      const errorMessage = "Nenhum card token fornecido";
      console.error(errorMessage);
      setError(errorMessage);
      return;
    }

    showPinIframe(cardToken);
  }, [cardToken, showPinIframe]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Defina o PIN do seu cartão</h1>
        <p className="text-muted-foreground mt-2">
          Seu cartão foi criado com sucesso. Defina um PIN seguro para concluir o processo.
        </p>
        <StandardAlert
          variant="info"
          description={
            <p className="text-left">
              Esta etapa é obrigatória para utilizar seu cartão.
              <br />
              Não será possível definir o PIN após esta etapa.
              <br />
              Não atualize nem feche esta página até definir o PIN.
            </p>
          }
          className="mt-4"
        />
      </div>
      {error && <StandardAlert variant="destructive" description={error} className="mb-6" />}

      <div className={`flex justify-center ${effectiveTheme === "dark" ? "bg-white text-black py-4" : ""}`}>
        <div id={iframeId} className="w-full max-w-md min-h-64" style={{ minHeight: "400px" }} />
      </div>
    </div>
  );
};
