import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const { calendarIds, timeMin, timeMax, token } = request.body || {};
  const queryToken = request.query.token as string;
  const accessToken = token || queryToken;

  // Handle GET request for Calendar List (Metadata/Colors)
  if (request.method === 'GET') {
    if (!accessToken) {
      return response.status(401).json({ error: "Access token required for calendar list" });
    }
    try {
      const res = await axios.get("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.status(200).json(res.data.items || []);
    } catch (err: any) {
      console.error("Error fetching calendar list:", err.response?.data || err.message);
      return response.status(err.response?.status || 500).json({ error: "فشل تحميل قائمة العيادات" });
    }
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!apiKey || apiKey === "YOUR_GOOGLE_CALENDAR_API_KEY") {
    return response.status(400).json({ 
      error: "Google Calendar API Key is missing. Please set GOOGLE_CALENDAR_API_KEY in Vercel environment variables." 
    });
  }

  if (!calendarIds || !Array.isArray(calendarIds) || calendarIds.length === 0) {
    return response.status(400).json({ error: "يرجى اختيار عيادة واحدة على الأقل" });
  }

  try {
    const fetchPromises = calendarIds.map(async (calendarId) => {
      try {
        const res = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            params: {
              key: apiKey,
              timeMin: timeMin,
              timeMax: timeMax,
              singleEvents: true,
              orderBy: "startTime",
            },
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
          }
        );
        return { calendarId, events: res.data.items || [] };
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
    return response.status(200).json(results);
  } catch (error: any) {
    console.error("Global Schedule fetching error:", error);
    return response.status(500).json({ error: "فشل النظام في معالجة طلب المواعيد" });
  }
}
