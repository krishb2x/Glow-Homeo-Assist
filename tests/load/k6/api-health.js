import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.API_BASE_URL || "http://localhost:4000";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"]
  }
};

export default function () {
  const res = http.get(`${BASE}/health`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body ok": (r) => r.json("success") === true
  });
  sleep(0.5);
}
