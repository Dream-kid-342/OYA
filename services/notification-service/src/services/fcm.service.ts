import admin from 'firebase-admin';

let initialized = false;

function initFirebase() {
  if (initialized) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  initialized = true;
}

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification via FCM.
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  initFirebase();

  try {
    await admin.messaging().send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'oya_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    return true;
  } catch (err: any) {
    // Token invalid — log but don't throw
    if (err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered') {
      console.warn(`[FCM] Invalid token, should be removed: ${payload.token}`);
      return false;
    }
    throw err;
  }
}

/**
 * Send bulk push notifications.
 */
export async function sendBulkPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ successCount: number; failureCount: number }> {
  initFirebase();

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title, body },
    data,
    android: { notification: { sound: 'default', channelId: 'oya_notifications' } },
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}
