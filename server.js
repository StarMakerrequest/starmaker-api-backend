const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*"
}));

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;

const UPSTREAM_API_URL =
  process.env.UPSTREAM_API_URL || "";

const UPSTREAM_API_TOKEN =
  process.env.UPSTREAM_API_TOKEN || "";

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
      "vip_level_wealth"
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

    if (!UPSTREAM_API_URL) {
      return res.status(500).json({
        ok: false,
        error: "UPSTREAM_API_URL is not configured"
      });
    }

    const payload = {
      sid,
      user_email,
      request_type
    };

    if (request_type === "vip_level_wealth") {
      payload.vip_level = Number(vip_level);
    }

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (UPSTREAM_API_TOKEN) {
      headers["Authorization"] =
        `Bearer ${UPSTREAM_API_TOKEN}`;
    }

    const upstream = await fetch(UPSTREAM_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text
      };
    }

    return res.status(upstream.status).json({
      http_status: upstream.status,
      upstream_response: data
    });

  } catch (error) {

    return res.status(502).json({
      ok: false,
      error: "Upstream request failed",
      message: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
