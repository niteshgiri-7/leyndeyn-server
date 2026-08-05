export type Data = "amount|groupName";

export interface PayloadData {
  groupName: string;
  amount: string;
  actorName: string;
}

export interface PushPayload {
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, string>;
  imageUrl: string | null;
}

export interface TokenResult {
  token: string;
  success: boolean;
}

export interface PushSendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  results: TokenResult[];
  errors: (string | undefined)[];
}

export interface NotificationSender {
  send(payload: PushPayload): Promise<PushSendResult>;
  debugSend(): Promise<void>;
}
