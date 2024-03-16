import { kv } from '@vercel/kv'
import { request } from 'http';
import { NextRequest, NextResponse } from "next/server";

import { sleepMs, sshConnections } from "@/app/lib/utils"
import SSH2Promise from 'ssh2-promise';

/*
curl -X POST http://localhost:3000/api/ssh/status -H 'openai-ephemeral-user-id: abc' \
-H "Content-Type: application/json" -d \
'{"host": "localhost", "username": "root", "port": 2222}'
*/

export async function POST(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const headers = Object.fromEntries(request.headers);
  console.log('api/ssh/status POST: start', { params, headers });
  const openaiGptId = headers['openai-gpt-id'];
  const openaiEphemeralUserId = headers['openai-ephemeral-user-id'];
  const openaiConversationId = headers['openai-conversation-id'];
  const body = await request.json();
  console.log('api/ssh/status POST: body', { body });

  if (!body.host || typeof body.host !== 'string') {
    console.warn('api/ssh/status POST: Invalid host', { body });
    return new Response(JSON.stringify({ error: 'Invalid host' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!body.username || typeof body.username !== 'string') {
    console.warn('api/ssh/status POST: Invalid username', { body });
    return new Response(JSON.stringify({ error: 'Invalid username' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  body.port ??= 22;
  if (!body.port || typeof body.port !== 'number') {
    console.warn('api/ssh/status POST: Invalid port', { body });
    return new Response(JSON.stringify({ error: 'Invalid port' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const config = {
    host: body.host,
    username: body.username,
    port: body.port,
  };

  if(process.env.SSH_PRIVATE_KEY) {
    config.privateKey = process.env.SSH_PRIVATE_KEY;
  }
  else if(process.env.SSH_IDENTITY) {
    config.identity = process.env.SSH_IDENTITY;
  }

  console.log('api/ssh/status POST: config', { openaiEphemeralUserId, config : { ...config, privateKey: '***' }});

  const oldClient = sshConnections[openaiEphemeralUserId];
  if (oldClient) {
    try {
      await oldClient.ssh.close();
    } catch (err) {
      console.warn('sshTest: oldClient.close error', { err });
    }
    sshConnections[openaiEphemeralUserId] = undefined;
  }

  const client = {
    ssh: new SSH2Promise(config),
    createdAt: new Date(),
    config,
  };
  await client.ssh.connect();
  sshConnections[openaiEphemeralUserId] = client;

  const data = {
    result: 'ok',
  };
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/*
curl "http://localhost:3000/api/ssh/status?sleep=1" -H 'openai-ephemeral-user-id: abc'
*/

export async function GET(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const headers = Object.fromEntries(request.headers);
  console.log('api/ssh/status GET: start', { params, headers });
  const openaiGptId = headers['openai-gpt-id'];
  const openaiEphemeralUserId = headers['openai-ephemeral-user-id'];
  const openaiConversationId = headers['openai-conversation-id'];

  const client = sshConnections[openaiEphemeralUserId];
  if (!client) {
    return new Response(JSON.stringify({ error: 'Not connected, you must first POST config to /api/ssh/status' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sleep = params.sleep || 0;
  if (sleep) {
    await sleepMs(sleep);
  }

  const result = {
    ready: !client.ssh.currentOperation,
    lastOperation: client.ssh.lastOperation,
    currentOperation: client.ssh.currentOperation
  };
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
