export async function sendPushNotification(payload: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<boolean> {
  console.log('Push notification (mock) sent:', payload);
  return true;
}
