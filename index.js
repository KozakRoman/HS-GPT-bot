const OpenAI = require("openai");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

async function main(event = {}, callback = () => {}) {
  // console.log({ event });

  const userMessageStr = event.userMessage?.message || "";
  const session = event.session;
  let threadId = session?.customState?.threadId;

  // create a new thread if it is a new session
  if (!threadId) {
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
  }

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: userMessageStr
  });

  let run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: ASSISTANT_ID
  });

  do {
    run = await openai.beta.threads.runs.retrieve(threadId, run.id);
  } while (
    !["cancelled", "failed", "completed", "expired"].includes(run.status)
  );

  const messages = await openai.beta.threads.messages.list(threadId);

  const content = messages.data[0].content;

  const responseJson = {
    botMessage: content[0].text.value,
    responseExpected: true,
    customState: {
      threadId
    }
  };

  callback(responseJson);
}

// main();

exports.main = main;
