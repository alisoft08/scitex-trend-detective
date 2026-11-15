// AI-assisted: Codex (OpenAI).
import { chatResponse } from "../server/chat";

export default {
  fetch(request: Request) {
    return chatResponse(request, process.env);
  },
};
