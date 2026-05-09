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
  const PORT = 3000;

  app.use(express.json());

  // API Route for schedules
  app.post("/api/schedule", async (req, res) => {
    const { calendarIds, timeMin, timeMax } = req.body;
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!apiKey || apiKey === "YOUR_GOOGLE_CALENDAR_API_KEY") {
      return res.status(400).json({ error: "Google Calendar API Key is missing. Please set GOOGLE_CALENDAR_API_KEY in the Secrets panel." });
    }

    if (!calendarIds || !Array.isArray(calendarIds) || calendarIds.length === 0) {
      return res.status(400).json({ error: "يرجى اختيار عيادة واحدة على الأقل" });
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
            events: [], 
            error: `فشل تحميل تقويم ${calendarId}: ${errorData}` 
          };
        }
      });

      const results = await Promise.all(fetchPromises);
      res.json(results);
    } catch (error: any) {
      console.error("Global Schedule fetching error:", error);
      res.status(500).json({ error: "فشل النظام في معالجة طلب المواعيد" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
