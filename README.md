# Clarity 2.0

Clarity is a lightweight local-first workspace MVP for capturing thoughts, tasks, reflections, and AI-assisted conversations.

## What it does

- Provides a single-page workspace shell with navigation for Dashboard, Thoughts, Tasks, Reflections, Chat, and Settings
- Lets users save thoughts, tasks, and reflections locally in the browser
- Connects to a local Express backend for chat and admin diagnostics
- Supports a local chat fallback so the app can run without an OpenAI API key

## Quick start

1. Clone the repository
   ```bash
   git clone https://github.com/kevinanthonypamisetti/Clarity_2.0.git
   cd Clarity_2.0
   ```

2. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

3. Start the backend
   ```bash
   node server.js
   ```

4. Open the app
   - Visit http://localhost:3000/
   - Use /secret-admin to open the hidden developer console

## Environment variables

Optional environment variables:

```bash
# Optional: enable PostgreSQL-backed memory storage
DATABASE_URL=postgres://user:password@localhost:5432/clarity

# Optional: enable OpenAI chat responses
OPENAI_API_KEY=your_key_here
```

## Project structure

```text
backend/
  public/
    index.html
    assets/css/style.css
    assets/js/app.js
  routes/
    admin.js
    chat.js
    rag.js
  server.js
```

## How to use it

- Create a Thought from the Thoughts page
- Create a Task from the Tasks page
- Create a Reflection from the Reflections page
- Open Chat and ask a question
- Use Ctrl+Shift+A to open the developer console

## Notes

- The app works locally without PostgreSQL
- If no OpenAI key is configured, the chat page uses the local fallback provider
- The admin console reports backend status and local diagnostics
