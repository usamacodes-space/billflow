import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function getPlaidClient(): PlaidApi {
  const clientId = env("PLAID_CLIENT_ID");
  const secret = env("PLAID_SECRET");
  const envName = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();
  const basePath =
    envName === "production"
      ? PlaidEnvironments.production
      : envName === "development"
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  const config = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
  return new PlaidApi(config);
}
