export async function sendSms(phone: string, message: string): Promise<boolean> {
  console.log(`SMS (mock) sent to ${phone}: ${message}`);
  return true;
}

export function formatSmsMessage(title: string, body: string): string {
  return `${title}\n${body}`;
}
