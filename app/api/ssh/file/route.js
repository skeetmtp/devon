import { kv } from '@vercel/kv'
import { request } from 'http';
import { NextRequest, NextResponse } from "next/server";

import { sshConnections, waitStream, fulfillWithTimeLimit } from "@/app/lib/utils"

/*
curl -X POST http://localhost:3000/api/ssh/file\?path\=foo.txt  -H 'openai-ephemeral-user-id: abc' \
-H "Content-Type: application/json" -d \
'{"content": "hello world"}'
*/

export async function POST(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const headers = Object.fromEntries(request.headers);
  console.log('api/ssh/exec POST: start', { params, headers });
  const openaiGptId = headers['openai-gpt-id'];
  const openaiEphemeralUserId = headers['openai-ephemeral-user-id'];
  const openaiConversationId = headers['openai-conversation-id'];

  const body = await request.json();
  console.log('api/ssh/file POST: body', { body });

  if (!body.content || typeof body.content !== 'string') {
    console.warn('api/ssh/file POST: Invalid content', { body });
    return new Response(JSON.stringify({ error: 'Invalid content' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  const path = params.path;
  if (!path || typeof path !== 'string') {
    console.warn('api/ssh/file POST: Invalid path', { path });
    return new Response(JSON.stringify({ error: 'Invalid path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = sshConnections[openaiEphemeralUserId];
  if (!client) {
    console.warn('api/ssh/file POST: Not connected', { openaiEphemeralUserId });
    return new Response(JSON.stringify({ error: 'Not connected, you must first POST config to /api/ssh/status' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  try {
    // save utf8 content to path on remote server
    const sftp = client.ssh.sftp();
    const res = await sftp.writeFile(path, body.content, 'utf8');

    return new Response(JSON.stringify({ res }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.warn('api/ssh/file POST: error', { err });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

