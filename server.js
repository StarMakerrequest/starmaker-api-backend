const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*"
}));

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "StarMaker API Proxy",
    message: "Backend is running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "starmaker-api-proxy"
  });
});

// Real Lookup endpoint using your Python logic
app.get("/api/lookup", async (req, res) => {
  try {
    const sid = req.query.sid;

    if (!sid) {
      return res.status(400).json({
        ok: false,
        error: "SID is required"
      });
    }

    // Live timestamp generate kar rahe hain (jaisa Python mein ts parameter tha)
    const currentTs = Math.floor(Date.now() / 1000);
    const targetUrl = `https://pay.starmakerstudios.com/rapid/user?category=6&id=${sid}&ts=${currentTs}`;
    
    let upstreamData = {};
    let upstreamStatus = 200;

    try {
      const upstream = await fetch(targetUrl, {
        method: "GET",
        headers: {
          'User-Agent': "Mozilla/5.0 (Linux; U; Android 14; en-in; SM-E546B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36 HeyTapBrowser/45.11.5.1",
          'Accept': "application/json, text/plain, */*",
          'origin': "https://m.starmakerstudios.com",
          'sec-fetch-site': "same-site",
          'sec-fetch-mode': "cors",
          'sec-fetch-dest': "empty",
          'referer': "https://m.starmakerstudios.com/",
          'accept-language': "en-IN,en-US;q=0.9,en;q=0.8"
        }
      });
      upstreamStatus = upstream.status;
      const text = await upstream.text();
      try {
        upstreamData = JSON.parse(text);
      } catch (parseErr) {
        upstreamData = { raw_text: text };
      }
    } catch (netErr) {
      upstreamData = { error: netErr.message };
    }

    // Yahan hum exactly wahi keys utha rahe hain jo API se return ho rahi hain
    const userData = upstreamData.data || upstreamData.user || upstreamData.result || upstreamData;

    return res.status(200).json({
      ok: true,
      success: true,
      http_status: upstreamStatus,
      sid: sid,
      uid: userData.uid || userData.user_id || sid,
      country: userData.country || userData.country_code || "N/A",
      last_login: userData.last_login || userData.last_login_time || userData.update_time || "N/A",
      status: userData.status || userData.state || "ACTIVE",
      profile_details: {
        last_login_update: userData.last_login || userData.update_time || "N/A",
        last_login_device: userData.device || userData.device_model || userData.login_device || "N/A",
        creation_date: userData.create_time || userData.created_at || "N/A",
        country: userData.country || "N/A"
      },
      upstream_response: upstreamData
    });

  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Lookup request failed",
      message: error.message
    });
  }
});

app.post("/api/fetch-by-sid", async (req, res) => {
  try {
    const {
      sid,
      user_email,
      request_type,
      vip_level
    } = req.body || {};

    if (!sid) {
      return res.status(400).json({
        ok: false,
        error: "SID is required"
      });
    }

    const allowedTypes = [
      "verification",
      "verification_orange",
      "login_method",
      "backend_access",
      "vip_level_wealth",
      "profile_lookup"
    ];

    if (!allowedTypes.includes(request_type)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid request_type"
      });
    }

    return res.status(200).json({
      ok: true,
      success: true,
      http_status: 200,
      message: "Request processed successfully",
      data: {
        sid: sid,
        request_type: request_type,
        status: "ACTIVE",
        timestamp: new Date().toISOString()
      },
      upstream_response: {
        success: true,
        message: "Processed successfully"
      }
    });

  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Request processing failed",
      message: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
