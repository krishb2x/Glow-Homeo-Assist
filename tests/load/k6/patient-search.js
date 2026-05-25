import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.API_BASE_URL || "http://localhost:4000";
const TOKEN = __ENV.E2E_BEARER_TOKEN;

export const options = {
  vus: 5,
  duration: "1m",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"]
  }
};

export default function () {
  if (!TOKEN) {
    console.warn("E2E_BEARER_TOKEN not set — skipping");
    return;
  }
  const res = http.get(`${BASE}/api/doctor/patients?limit=50&search=a`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  check(res, { "patients 200": (r) => r.status === 200 });
  sleep(1);
}
