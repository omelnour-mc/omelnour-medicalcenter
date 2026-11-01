import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Route to fetch user calendars for colors/metadata
  app.get("/api/schedule", async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: "Missing access token" });
    }
    try {
      const response = await axios.get("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${token}` },
      });
      res.json(response.data.items || []);
    } catch (err: any) {
      console.error("Error fetching calendar list:", err.response?.data || err.message);
      res.status(err.response?.status || 500).json({ error: "Failed to fetch calendar list" });
    }
  });

  // API Route for schedules
  app.post("/api/schedule", async (req, res) => {
    const { calendarIds, timeMin, timeMax } = req.body;
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!calendarIds || !Array.isArray(calendarIds) || calendarIds.length === 0) {
      return res.status(400).json({ error: "يرجى اختيار عيادة واحدة على الأقل" });
    }

    if (!apiKey || apiKey === "YOUR_GOOGLE_CALENDAR_API_KEY") {
      const fallbackResults = calendarIds.map((id) => ({ calendarId: id, events: [] }));
      return res.json(fallbackResults);
    }

    try {
      const fetchPromises = calendarIds.map(async (calendarId) => {
        try {
          const response = await axios.get(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              params: {
                key: apiKey,
                timeMin: timeMin,
                timeMax: timeMax,
                singleEvents: true,
                orderBy: "startTime",
              },
            }
          );
          return { calendarId, events: response.data.items || [] };
        } catch (err: any) {
          const status = err.response?.status;
          const errorData = err.response?.data?.error?.message || err.message;
          console.error(`Error fetching calendar ${calendarId} (Status ${status}):`, errorData);
          return { 
            calendarId, 
            events: [] 
          };
        }
      });

      const results = await Promise.all(fetchPromises);
      res.json(results);
    } catch (error: any) {
      console.error("Global Schedule fetching error:", error);
      res.json(calendarIds.map((id) => ({ calendarId: id, events: [] })));
    }
  });

  // API Route for updating events via Service Account
  app.patch("/api/update-event", async (req, res) => {
    const { calendarId, eventId, summary, start, end } = req.body;
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ error: "Service account credentials not configured" });
    }

    try {
      const { JWT } = await import('google-auth-library');
      const auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
      });

      const { google } = await import('googleapis');
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.patch({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: {
          summary,
          start,
          end,
        },
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating calendar event via Service Account:", err);
      res.status(500).json({ error: "فشل تحديث الموعد: " + err.message });
    }
  });

  // API Route to verify admin
  app.post("/api/check-admin", async (req, res) => {
    const { email } = req.body;
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",") : ["omelnour.medicalcenter@gmail.com"];
    res.json({ isAdmin: adminEmails.includes(email) });
  });

  // API Route for deleting events via Service Account
  app.delete("/api/delete-event", async (req, res) => {
    const { calendarId, eventId, scope } = req.body;
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ error: "Service account credentials not configured" });
    }

    try {
      const { JWT } = await import('google-auth-library');
      const auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
      });

      const { google } = await import('googleapis');
      const calendar = google.calendar({ version: 'v3', auth });

      // If scope is 'upcoming' or 'all', we need to handle recurring event series
      // This is complex. For free implementation, simple delete should work for single events,
      // and for recurring events, we need the event ID of the series.
      
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendUpdates: 'none'
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting calendar event via Service Account:", err);
      res.status(500).json({ error: "فشل حذف الموعد: " + err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("uncaughtException", (err) => {
  console.error("Server uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Server unhandled rejection:", reason);
});

startServer();
