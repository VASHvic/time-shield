import { sendBackgroundMessage } from '@/messages';

export function useBackgroundMessage() {
  const sendMessage = sendBackgroundMessage;

  return { sendMessage };
}
