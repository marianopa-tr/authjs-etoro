/** Decoded eToro id_token payload shape. */
export interface EToroProfile {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
}
