// This line is loading the OpenAI official sdk library
const OpenAI = require("openai");

// This line is setting the OPENAI_API_KEY and ASSISTANT_ID constants from the environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// This line is creating a new instance of the OpenAI client. It allows us to call the OpenAI APIs.
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// This is the main function that is called by HubSpot when a message is received from the user.
async function main(event = {}, callback) {
  // This line is extracting the user message from the event object
  const userMessageStr = event.userMessage?.message || "";

  // This line is extracting the threadId from the event object. This is used to keep track of the conversation.
  const session = event.session;
  let threadId = session?.customState?.threadId;

  // Create a new thread by using OpenAI sdk client if it is a new session. Otherwise, use the existing thread id.
  if (!threadId) {
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
  }

  // This line is sending the user message to the OpenAI API to save it in the thread. Assistant answer generation is not happening here.
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: userMessageStr
  });

  // This line is trigger OpenAI API to start generate an answer from the assistant. It might take a few seconds to complete.
  let run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: ASSISTANT_ID
  });

  // This loop is checking the status of the answer generation by sending a request to the OpenAI API. It will keep checking until the status is completed.
  do {
    run = await openai.beta.threads.runs.retrieve(threadId, run.id);
  } while (
    !["cancelled", "failed", "completed", "expired"].includes(run.status)
  );

  // This line is getting the answer from the OpenAI API.
  const messages = await openai.beta.threads.messages.list(threadId);

  // This line is extracting the answer from the response.
  const content = messages.data[0].content;

  // This line is preparing the response to HubSpot. It contains the answer from the assistant, and the threadId to keep track of the conversation.
  const responseJson = {
    botMessage: content[0].text.value,
    responseExpected: true,
    customState: {
      threadId
    }
  };

  // This line is sending the response back to HubSpot chat bot.
  callback(responseJson);
}

// This line is exporting the main function so that HubSpot can call it.
exports.main = main;
