import { StandardAlert } from "./ui/standard-alert";

export const QueueNotEmptyAlert = () => {
  return (
    <StandardAlert
      variant="destructive"
      description="Outra transação já está na fila. Aguarde sua conclusão antes de enviar outra."
    />
  );
};
