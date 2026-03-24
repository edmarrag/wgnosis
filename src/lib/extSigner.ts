export type SignResult = { signature: string };
export type AddressResult = { address: string };

function waitForMessage<T>(type: string, timeout = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler as EventListener);
      reject(new Error('Timeout aguardando resposta da extensão'));
    }, timeout);
    function handler(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.type !== type) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler as EventListener);
      if (data.error) {
        reject(new Error(String(data.error)));
        return;
      }
      resolve(data as T);
    }
    window.addEventListener('message', handler as EventListener);
  });
}

export async function getExtensionAddress(timeoutMs?: number): Promise<string> {
  window.postMessage({ type: 'CORVAX_GET_ADDRESS_REQUEST' }, '*');
  const res = await waitForMessage<{ type: string; address: string; error?: string }>('CORVAX_GET_ADDRESS_RESPONSE', timeoutMs ?? 10000);
  if (!res.address) throw new Error('Endereço não retornado pela extensão');
  return res.address;
}

export async function signLoginMessage(message: string): Promise<string> {
  window.postMessage({ type: 'CORVAX_SIGN_REQUEST', payload: { type: 'login', message } }, '*');
  const res = await waitForMessage<{ type: string; signature: string; error?: string }>('CORVAX_SIGN_RESPONSE');
  if (!res.signature) throw new Error('Assinatura não retornada pela extensão');
  return res.signature;
}
