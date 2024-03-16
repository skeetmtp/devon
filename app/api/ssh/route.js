import { kv } from '@vercel/kv'
import { request } from 'http';
import { NextRequest, NextResponse } from "next/server";


class Conversation {
  constructor(conversationId) {
    this.conversationId = conversationId;
  }

}

let conversations = {};

/*
curl "http://localhost:3000/api/instructions?message=alban" -H 'openai-conversation-id: abc'
*/

export async function GET(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const headers = Object.fromEntries(request.headers);
  // console.log('GET: start', { params, headers });
  const conversationId = headers['openai-conversation-id'] || 'default';
  const conversation = conversations[conversationId];
  // console.log('GET: start', {name: conversation?.puppet.name, conversationId, params});

  if (!conversation?.funcToDos.length) {
    return new Response(JSON.stringify({ error: 'No instructions available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  const { read, answer } = conversation.funcToDos.shift();
  console.log('Received call', { params });
  read.resolve({ answer, params });

  // Wait for gptReply to be called with the result
  const instruction = await answer.promise;
  console.log('Sending instruction', { instruction });

  const json = { instruction };
  return NextResponse.json(json);
}



/*
curl -X POST http://localhost:3000/api/instructions -H 'openai-conversation-id: abc' \
-H "Content-Type: application/json" -d \
'{"author": "John Doe"}'
*/

export async function POST(request) {
  const body = await request.json();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const headers = Object.fromEntries(request.headers);
  // console.log('POST', { body, params, headers });
  const conversationId = headers['openai-conversation-id'] || 'default';
  // console.log('POST: start', {conversationId});
  console.log('New conversation');

  if (conversations[conversationId]) {
    const conversation = conversations[conversationId];
    console.log('POST: reset', {name: conversation.puppet.name, conversationId});
    const funcToDos = conversation.funcToDos;
    // Cancel previous promises
    funcToDos.forEach((funcToDo) => {
      if (funcToDo.read) {
        funcToDo.read.reject('Clearing conversation: read');
      }
      if (funcToDo.answer) {
        funcToDo.answer.reject('Clearing conversation: answer');
      }
    }
    );
  }
  const conversation = new Conversation(conversationId, puppet);

  conversations[conversationId] = conversation;
  const scriptPromise = conversation.puppet.script(conversation);
  scriptPromise.catch((reason) => {
    console.log('script: catch', { reason });
  });

  // Return a response to indicate success
  return new Response(JSON.stringify({ response: puppet.prompt }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}


