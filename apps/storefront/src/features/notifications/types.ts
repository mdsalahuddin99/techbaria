export type NotificationType =
  | "low_stock"
  | "sale"
  | "purchase_received"
  | "payment"
  | "info"
  | "return";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
}
