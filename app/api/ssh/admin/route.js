import { NextRequest, NextResponse } from "next/server";
import { sshConnections } from "@/app/lib/utils"

/*
curl "http://localhost:3000/api/ssh/admin" -H 'openai-ephemeral-user-id: abc'
*/
export async function GET(request) {
  // sshConnections is a dictionary of ephemeral user ids to ssh clients
  // Extract the config from the client
  console.log('api/ssh/admin GET: start', { sshConnections });
  const configs = Object.entries(sshConnections).map(([key, value]) => {
    return { config: { ...value.config,  identity: undefined }, key };
  });
  return new NextResponse(JSON.stringify(configs), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
