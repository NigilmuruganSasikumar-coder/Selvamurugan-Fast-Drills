/* ===== Chat backend (Groq via your own Cloudflare Worker) =====
   The API key is NOT stored in this file. It lives safely inside the Worker.
   After deploying worker.js, paste the Worker URL below. */
const CHAT_ENDPOINT = "https://long-pine-751nisite-ai.nigilmuruganss.workers.dev/";

const SYSTEM_PROMPT = `
You are the AI assistant embedded on the website of Selvamurugan Fast Drills
(SMFD), a borewell drilling company based in Madurai, Tamil Nadu, India.

BUSINESS FACTS (use these; don't invent extra facts you're not sure of):
- Services: deep borewell drilling, residential & agricultural drilling,
  water survey / site consultation, borewell maintenance & repair,
  24/7 emergency borewell service.
- Service area: Madurai city (main hub) and surrounding areas — Pudur,
  Ayanur, Alagar Kovil, Anna Nagar, K.Pudur, Kalavasal, Villapuram,
  Madurai North & East, Madurai South & West. Larger projects are also
  taken up across Tamil Nadu & Maharashtra.
- Pricing: drilling is roughly ₹70–450 per foot depending on bore
  diameter/type, plus 18% GST, plus a separate "bore bata" charge. Exact
  pricing depends on site conditions and soil type, so never quote a final
  number — mention the site has a detailed cost calculator, and a final
  quote comes from the team after understanding their site.
- Contact: Call +91 97887 99883 or +91 94432 88845. WhatsApp +91 94881 61788.
- 30+ years of drilling experience, 24×7 emergency support.

HOW TO BEHAVE:
- You are a full, general-purpose AI assistant. Hold natural conversation
  and answer questions on ANY topic the visitor raises — not only
  borewell-related ones. Be helpful and conversational, like a normal AI
  chat assistant (e.g. ChatGPT). Don't restrict yourself to a fixed set of
  pre-written questions or answers.
- When the conversation is about SMFD's services, ground your answers in
  the business facts above. If asked something about the business you
  don't know, say so honestly and suggest calling the team.
- Keep replies reasonably concise and easy to read in a chat bubble.

LEAD CAPTURE (do this naturally, don't interrogate):
- If the visitor shows real interest — wants a quote, wants to book
  drilling or a site visit, or asks to be contacted — ask for their name,
  phone number, and drilling location, one at a time, woven naturally
  into the conversation. Once you have all three, thank them and tell
  them the SMFD team will call them shortly.
`.trim();

let history = [];

const scrollEl = document.getElementById("chatScroll");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("chatSend");

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
});

// Enter sends the message; Shift+Enter still inserts a newline.
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
  setBusy(true);
  const typingEl = addTyping();

  try {
    const reply = await askChat(text);
    typingEl.remove();
    addMessage("bot", reply);
  } catch (err) {
    console.error("Chat error:", err);
    typingEl.remove();
    addMessage("bot", "Sorry, I ran into an issue reaching the AI service (" + err.message + "). Please try again, or call us directly at +91 97887 99883.");
  } finally {
    setBusy(false);
  }
});

async function askChat(userText) {
  if (!CHAT_ENDPOINT || CHAT_ENDPOINT.startsWith("PASTE_")) {
    throw new Error("chat service is not connected yet");
  }
  history.push({ role: "user", content: userText });

  const payload = JSON.stringify({
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });

  const MAX_ATTEMPTS = 3;
  let lastErr;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (res.status === 503 || res.status === 429) {
        lastErr = new Error(`API returned ${res.status}`);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, attempt * 700));
          continue;
        }
        throw lastErr;
      }

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Chat API error response:", errBody);
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data?.choices?.[0]?.message?.content?.trim()
        || "Sorry, I didn't quite catch that — could you rephrase?";

      history.push({ role: "assistant", content: replyText });
      return replyText;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 700));
      }
    }
  }

  history.pop();
  throw lastErr;
}

function setBusy(busy) { sendBtn.disabled = busy; input.disabled = busy; }

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMessage(role, text) {
  const isUser = role === "user";
  const wrap = document.createElement("div");
  wrap.className = `chat-msg chat-msg--${isUser ? "user" : "bot"}`;

  const col = document.createElement("div");
  col.className = "chat-bubble-col";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text;
  col.appendChild(bubble);

  const meta = document.createElement("div");
  meta.className = "chat-meta";
  meta.innerHTML = isUser
    ? `<span>${formatTime()}</span><span class="tick">✓✓</span>`
    : `<span>${formatTime()}</span>`;
  col.appendChild(meta);

  wrap.appendChild(col);
  scrollEl.appendChild(wrap);
  scrollEl.scrollTop = scrollEl.scrollHeight;
  return wrap;
}

function addTyping() {
  const wrap = document.createElement("div");
  wrap.className = "chat-msg chat-msg--bot chat-typing";
  wrap.innerHTML = `<div class="chat-bubble-col"><div class="chat-bubble"><span></span><span></span><span></span></div></div>`;
  scrollEl.appendChild(wrap);
  scrollEl.scrollTop = scrollEl.scrollHeight;
  return wrap;
}
