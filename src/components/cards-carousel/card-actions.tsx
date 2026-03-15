import {
  CreditCard,
  Eye,
  Snowflake,
  AlertOctagon,
  Loader2,
  Sun,
  MoreHorizontal,
  MailCheck,
  EyeOff,
  BanIcon,
} from "lucide-react";
import { IconButton } from "../ui/icon-button";
import type { Card } from "@/client";
import { useGpSdk } from "@/hooks/useGpSdk";
import { toast } from "sonner";
import { Dialog } from "../ui/dialog";
import { useCallback, useMemo, useState } from "react";
import { useCards } from "@/context/CardsContext";
import { ReportCardModal } from "../modals/report-card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";

import { PSEDialogContent, PSEDialogTitle } from "../PSEDialog";
import { ConfirmationDialog } from "../modals/confirmation-dialog";
import { Switch } from "../ui/switch";

const PSE_IFRAME_ID = "pse-iframe";

export const CardActions = ({
  card,
  onToggleVoidedCardsVisibility,
}: {
  card: Card;
  onToggleVoidedCardsVisibility: () => void;
}) => {
  const { showCardDetails, showPin, isLoading } = useGpSdk();
  const {
    freezeCard,
    unfreezeCard,
    markCardAsStolen,
    markCardAsLost,
    cardInfoMap,
    activateCard,
    isHideVoidedCards,
    voidVirtualCard,
  } = useCards();
  const [isCardDetailsModalOpen, setIsCardDetailsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
  const [isVoidVirtualCardDialogOpen, setIsVoidVirtualCardDialogOpen] = useState(false);
  const cardInfo = useMemo(() => {
    if (!card.cardToken || !cardInfoMap) {
      return undefined;
    }

    return cardInfoMap[card.cardToken];
  }, [card.cardToken, cardInfoMap]);
  const canReport =
    !!card.activatedAt && !cardInfo?.isStolen && !cardInfo?.isLost && !cardInfo?.isVoid && !cardInfo?.isBlocked;

  const onShowCardDetails = useCallback(
    (cardToken?: string) => {
      if (!cardToken) {
        toast.error("Card token ausente");
        return;
      }

      try {
        showCardDetails(cardToken, PSE_IFRAME_ID);
        setIsCardDetailsModalOpen(true);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao exibir detalhes do cartão");
      }
    },
    [showCardDetails],
  );

  const onShowPin = useCallback(
    (cardToken?: string) => {
      if (!cardToken) {
        toast.error("Card token ausente");
        return;
      }

      try {
        showPin(cardToken, PSE_IFRAME_ID);
        setIsCardDetailsModalOpen(true);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao exibir PIN");
      }
    },
    [showPin],
  );

  const onConfirmActivation = useCallback(() => {
    activateCard(card.id);
    setIsActivationDialogOpen(false);
  }, [activateCard, card.id]);

  const onVoidVirtualCard = useCallback(() => {
    voidVirtualCard(card.id);
    setIsVoidVirtualCardDialogOpen(false);
  }, [voidVirtualCard, card.id]);

  return (
    <>
      <div className="flex flex-wrap gap-4 lg:gap-8 justify-center">
        {!card.activatedAt && (
          <IconButton
            icon={<MailCheck size={22} />}
            label="Ativar"
            onClick={() => setIsActivationDialogOpen(true)}
            size="lg"
            data-testid="card-action-activate"
          />
        )}
        <IconButton
          icon={<CreditCard size={22} />}
          label="Exibir detalhes"
          onClick={() => onShowCardDetails(card.cardToken)}
          size="lg"
          variant="default"
          data-testid="card-action-show-details"
        />
        <IconButton
          icon={<Eye size={22} />}
          label="Ver PIN"
          onClick={() => onShowPin(card.cardToken)}
          size="lg"
          variant="default"
          disabled={card.virtual}
          data-testid="card-action-see-pin"
        />
        {cardInfo?.isFrozen ? (
          <IconButton
            icon={<Sun size={22} />}
            label="Descongelar"
            onClick={() => unfreezeCard(card.id)}
            size="lg"
            variant="default"
            data-testid="card-action-unfreeze"
          />
        ) : (
          <IconButton
            icon={<Snowflake size={22} />}
            label="Congelar"
            onClick={() => freezeCard(card.id)}
            size="lg"
            variant="default"
            data-testid="card-action-freeze"
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span>
              <IconButton
                icon={<MoreHorizontal size={22} />}
                label="Mais"
                size="lg"
                variant="default"
                data-testid="card-action-more"
              />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {card.virtual && (
              <DropdownMenuItem
                onClick={() => setIsVoidVirtualCardDialogOpen(true)}
                data-testid="card-action-void-card"
              >
                <BanIcon size={22} /> Anular cartão
              </DropdownMenuItem>
            )}

            {canReport && (
              <DropdownMenuItem onClick={() => setIsReportModalOpen(true)} data-testid="card-action-report">
                <AlertOctagon size={22} /> Reportar
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onToggleVoidedCardsVisibility();
              }}
              className="flex items-center justify-between"
              data-testid="card-action-hide-voided-cards"
            >
              <div className="flex items-center gap-2">
                <EyeOff size={22} />
                Ocultar cartões anulados
              </div>
              <Switch
                checked={isHideVoidedCards}
                onCheckedChange={onToggleVoidedCardsVisibility}
                onClick={(e) => e.stopPropagation()}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isCardDetailsModalOpen} onOpenChange={setIsCardDetailsModalOpen}>
        <PSEDialogContent>
          <PSEDialogTitle>Detalhes do cartão</PSEDialogTitle>
          <div className="grid flex-1 gap-2">
            <div id={PSE_IFRAME_ID} />
          </div>
          {isLoading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
          )}
        </PSEDialogContent>
      </Dialog>

      <ReportCardModal
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        onReportAsLost={() => markCardAsLost(card.id)}
        onReportAsStolen={() => markCardAsStolen(card.id)}
      />

      <ConfirmationDialog
        open={isActivationDialogOpen}
        onOpenChange={setIsActivationDialogOpen}
        title="Ativar cartão"
        iconColor="text-warning"
        message="Ative seu cartão somente se você já o recebeu fisicamente."
        confirmText="Ativar cartão"
        onConfirm={onConfirmActivation}
      />
      <ConfirmationDialog
        open={isVoidVirtualCardDialogOpen}
        onOpenChange={setIsVoidVirtualCardDialogOpen}
        title="Anular cartão"
        iconColor="text-warning"
        message="Tem certeza de que deseja anular este cartão? Esta ação não pode ser desfeita."
        confirmText="Anular cartão"
        onConfirm={onVoidVirtualCard}
      />
    </>
  );
};
