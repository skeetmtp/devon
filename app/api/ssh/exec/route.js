import { kv } from '@vercel/kv'
import { request } from 'http';
import { NextRequest, NextResponse } from "next/server";

import { sshConnections, waitStream, fulfillWithTimeLimit } from "@/app/lib/utils"
export const maxDuration = 10; // This function can run longer than default timeout, but hobby ios limited to 10 seconds

/*
curl -X POST http://localhost:3000/api/ssh/exec -H 'openai-ephemeral-user-id: abc' \
-H "Content-Type: application/json" -d \
'ls -la'
*/

export async function POST(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const headers = Object.fromEntries(request.headers);
  console.log('api/ssh/exec POST: start', { params, headers });
  const openaiGptId = headers['openai-gpt-id'];
  const openaiEphemeralUserId = headers['openai-ephemeral-user-id'];
  const openaiConversationId = headers['openai-conversation-id'];
  const stdin = await request.text();

  if (!stdin || typeof stdin !== 'string') {
    console.warn('api/ssh/exec POST: Invalid stdin', { stdin });
    return new Response(JSON.stringify({ error: 'Invalid stdin' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = sshConnections[openaiEphemeralUserId];
  if (!client) {
    console.warn('api/ssh/exec POST: Not connected', { openaiEphemeralUserId });
    return new Response(JSON.stringify({ error: 'Not connected, you must first POST config to /api/ssh/status' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (client.currentOperation) {
      console.error('/ssh/exec: currentOperation in progress');
      return new Response(JSON.stringify({ error: 'currentOperation in progress', currentOperation: client.currentOperation }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    client.currentOperation = { stdin, status: {} };
    const socket = await client.ssh.spawn(stdin);
    console.log('/ssh/exec: spawned', { stdin, status: client.currentOperation.status });
    try {
      const cmdRes = await fulfillWithTimeLimit(40_000, waitStream(socket, client.currentOperation.status), new Error('timeout'));
      const result = { stdout: cmdRes.stdout, stderr: cmdRes.stderr || undefined };
      client.lastOperation = { stdin, stdout: cmdRes.stdout, stderr: cmdRes.stderr || undefined };
      console.log('/ssh/exec: result', { result });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (err.message !== 'timeout') throw err;
      console.warn('/ssh/exec: timeout', { stdin, status: client.currentOperation.status });
      client.lastOperation = { stdin, error: 'timeout' };
      return new Response(JSON.stringify({ message: 'command did not end in time', status: client.currentOperation.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  catch (err) {
    console.error('/ssh/exec: error', { err });
    client.lastOperation = { stdin, error: JSON.stringify(err) };
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    client.currentOperation = undefined;
  }
}

/*
curl "http://localhost:3000/api/ssh/exec?stdin=ls" -H 'openai-ephemeral-user-id: abc'
*/

export async function GET(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const headers = Object.fromEntries(request.headers);
  console.log('api/ssh/exec GET: start', { params, headers });
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

  const stdin = params.stdin;
  if(!stdin) {
    return new Response(JSON.stringify({ error: 'Missing stdin' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (client.currentOperation) {
      console.error('/ssh/exec: currentOperation in progress');
      return new Response(JSON.stringify({ error: 'currentOperation in progress', currentOperation: client.currentOperation }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    client.currentOperation = { stdin, status: {} };
    const socket = await client.ssh.spawn(stdin);
    console.log('/ssh/exec: spawned', { stdin, status: client.currentOperation.status });
    try {
      const cmdRes = await fulfillWithTimeLimit(40_000, waitStream(socket, client.currentOperation.status), new Error('timeout'));
      const result = { stdout: cmdRes.stdout, stderr: cmdRes.stderr || undefined };
      client.lastOperation = { stdin, stdout: cmdRes.stdout, stderr: cmdRes.stderr || undefined };
      console.log('/ssh/exec: result', { result });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (err.message !== 'timeout') throw err;
      console.log('/ssh/exec: timeout', { stdin, status: client.currentOperation.status });
      client.lastOperation = { stdin, error: 'timeout' };
      return new Response(JSON.stringify({ message: 'command did not end in time', status: client.currentOperation.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('/ssh/exec: error', { err });
    client.lastOperation = { stdin, error: JSON.stringify(err) };
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    client.currentOperation = undefined;
  }
}
