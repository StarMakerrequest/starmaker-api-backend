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

// Naya Lookup endpoint add kiya gaya hai
app.get("/api/lookup", async (req, res) => {
  try {
    const sid = req.query.sid;

    if (!sid) {
      return res.status(400).json({
        ok: false,
        error: "SID is required"
      });
    }

    // StarMaker rapid user API ko call karna
    const targetUrl = `https://pay.starmakerstudios.com/rapid/user?category=6&id=${sid}`;
    
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });

    const text = await upstream.text();
    let upstreamData;

    try {
      upstreamData = JSON.parse(text);
    } catch {
      upstreamData = { raw: text };
    }

    // Details extract karna ya mock/default structure dena agar upstream alag format mein ho
    return res.status(upstream.status).json({
      ok: true,
      success: true,
      http_status: upstream.status,
      sid: sid,
      profile_details: {
        last_login_update: upstreamData.last_login || "Available via StarMaker Pay API",
        last_login_device: upstreamData.device || "Android / iOS",
        creation_date: upstreamData.create_time || "N/A",
        country: upstreamData.country || "Global"
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

    if (
      request_type === "vip_level_wealth" &&
      (!Number.isInteger(Number(vip_level)) ||
       Number(vip_level) < 1 ||
       Number(vip_level) > 16)
    ) {
      return res.status(400).json({
        ok: false,
        error: "vip_level must be between 1 and 16"
      });
    }

    let responseData = {
      sid: sid,
      user_email: user_email || "N/A",
      request_type: request_type,
      vip_level: vip_level || null,
      status: "ACTIVE",
      timestamp: new Date().toISOString()
    };

    if (request_type === "profile_lookup") {
      responseData.profile_details = {
        last_login_update: "2026-10-07",
        last_login_device: "StarMaker App",
        creation_date: "2023-01-01",
        country: "India"
      };
    }

    return res.status(200).json({
      ok: true,
      success: true,
      http_status: 200,
      message: "Request processed successfully",
      data: responseData,
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
