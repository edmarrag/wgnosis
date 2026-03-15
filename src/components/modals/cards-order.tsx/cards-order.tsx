import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardsOrderSelection } from "./cards-order-selection";
import { CardsOrderVirtual } from "./cards-order-virtual";
import { LinkPhysicalCard } from "./link-physical-card";

export enum CardsOrderStep {
  Selection = "selection",
  Virtual = "virtual",
  LinkPhysical = "link-physical",
}

interface CardsOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CardsOrderModal = ({ open, onOpenChange }: CardsOrderModalProps) => {
  const [step, setStep] = useState<CardsOrderStep>(CardsOrderStep.Selection);

  const handleVirtualCardOrder = useCallback(() => {
    setStep(CardsOrderStep.Virtual);
  }, []);

  const handlePhysicalCardLink = useCallback(() => {
    setStep(CardsOrderStep.LinkPhysical);
  }, []);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep(CardsOrderStep.Selection);
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="card-order-modal">
        <DialogHeader>
          <DialogTitle>
            {step === CardsOrderStep.Selection && "Pedir um cartão"}
            {step === CardsOrderStep.Virtual && "Pedido de cartão virtual"}
            {step === CardsOrderStep.LinkPhysical && "Vincular um cartão físico"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === CardsOrderStep.Selection && (
            <CardsOrderSelection
              onVirtualCardOrder={handleVirtualCardOrder}
              onPhysicalCardLink={handlePhysicalCardLink}
              onClose={() => handleClose(false)}
            />
          )}

          {step === CardsOrderStep.Virtual && (
            <CardsOrderVirtual onClose={() => handleClose(false)} onGoBack={() => setStep(CardsOrderStep.Selection)} />
          )}

          {step === CardsOrderStep.LinkPhysical && (
            <LinkPhysicalCard onClose={() => handleClose(false)} onGoBack={() => setStep(CardsOrderStep.Selection)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
