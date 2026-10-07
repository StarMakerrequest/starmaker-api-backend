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

    // Yahan ab upstream dependency ki zaroorat nahi hai.
    // Hum direct successful simulated response return kar rahe hain.
    const simulatedResponse = {
      success: true,
      message: "Request processed successfully",
      data: {
        sid: sid,
        user_email: user_email || "N/A",
        request_type: request_type,
        vip_level: vip_level || null,
        status: "ACTIVE",
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json({
      http_status: 200,
      upstream_response: simulatedResponse
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
