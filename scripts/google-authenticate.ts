import { auth, calendar } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import http from "node:http";

const oauth2Client = new auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function authenticate(scopes: string[]) {
  const authorizationUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",
    /** Pass in the scopes array defined above.
     * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
    scope: scopes,
    // Enable incremental authorization. Recommended as a best practice.
    include_granted_scopes: true,
  });

  console.log(`Authorize this app by visiting this URL: ${authorizationUrl}`);

  return new Promise<OAuth2Client>((resolve, reject) => {
    const server = http.createServer();
    server.on("request", async (req, res) => {
      try {
        if (req.url?.startsWith("/oauth2callback")) {
          const url = new URL(req.url, process.env.GOOGLE_REDIRECT_URI);
          const code = url.searchParams.get("code");
          res.end("Authentication successful! Please return to the console.");
          server.close();

          if (!code) {
            throw new Error("No code provided code");
          }

          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          resolve(oauth2Client);
        }
      } catch (error) {
        reject(error);
      }
    });
    server.listen(3000);
  });
}

async function listCalendars(auth: OAuth2Client) {
  const calendarClient = calendar({ version: "v3", auth: auth });

  const res = await calendarClient.calendarList.list();
  const calendars = res.data.items;
  if (calendars?.length) {
    console.log("Calendars:");
    calendars.forEach((calendar) => {
      console.log(`${calendar.summary} (${calendar.id})`);
    });
  } else {
    console.log("No calendars found.");
  }
}

const scopes = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];
const authClient = await authenticate(scopes);
console.log({
  access_token: authClient.credentials.access_token,
  refresh_token: authClient.credentials.refresh_token,
});
await listCalendars(authClient);
