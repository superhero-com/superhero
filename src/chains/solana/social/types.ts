export type SocialPost = {
  id: string;
  slug: string;
  sender_address: string;
  content: string;
  media: string[];
  created_at: string;
  tx_hash: string;
  total_comments: number;
  post_id: string;
  content_hash: string;
  client_nonce: string;
  uri: string;
  type?: 'post' | 'comment';
  parent?: string;
};
