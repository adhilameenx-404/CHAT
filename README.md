# CodeChat

Anyone who opens the site gets a code (3 letters + 3 numbers). Another visitor enters that code and the two are connected in a private one-to-one chat.

## Run locally
    npm install
    npm start
Open http://localhost:3000 in two browser tabs.

## Put it online (Render, free tier)
1. Upload this folder to a GitHub repository.
2. On render.com: New > Web Service > connect the repository.
3. Build command: `npm install`   Start command: `npm start`
4. Render gives you a public URL such as https://codechat.onrender.com

Railway and Fly.io work the same way. The app reads the PORT variable automatically.
