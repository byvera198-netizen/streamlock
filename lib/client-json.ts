/* API payloads are narrowed by each consuming client component after the network boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type JsonPayload = Record<string, any>;

export async function readJson(response: Response): Promise<JsonPayload> {
  return (await response.json()) as JsonPayload;
}
