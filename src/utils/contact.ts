import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * "Advertise With Us" contact inbox — the Sidebar widget card and the
 * Footer button both open the same modal, which calls this. The message is
 * written straight to Firestore (no Cloud Function needed on the write
 * path); firestore.rules restricts *reading* /ad_inquiries to the Chief
 * Administrator, and a Cloud Function (onAdInquiryCreated, see
 * functions/src/index.ts) emails them so a new inquiry doesn't sit unseen.
 */
export async function submitAdInquiry(email: string, message: string, name?: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanMessage = message.trim();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanMessage) return false;

  try {
    await addDoc(collection(db, 'ad_inquiries'), {
      email: cleanEmail,
      message: cleanMessage.slice(0, 4000),
      ...(name?.trim() ? { name: name.trim().slice(0, 120) } : {}),
      createdAt: new Date().toISOString(),
      read: false,
    });
    return true;
  } catch (err) {
    console.warn('submitAdInquiry error:', err);
    return false;
  }
}
