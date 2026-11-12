export const sampleCases = [
  {
    id: "CAS-2841",
    title: "Checkout API returns 502 after EU deployment",
    customer: "Northstar Retail",
    contact: "Maya Chen",
    accountTier: "Enterprise",
    productArea: "API Gateway",
    reportedAt: "2026-11-12T08:42:00Z",
    channel: "Pager",
    status: "unassigned",
    description: "Checkout requests in eu-west have been failing since 08:30 UTC. The failure rate is 38% and is rising. A deployment finished at 08:26. Customers cannot complete payment and the incident is blocking the regional launch.",
    logs: "gateway_5xx=38%\nupstream_connect_timeout=1.8s\nactive_revision=checkout-eu-7f3c\nprevious_healthy=checkout-eu-6b1a\nregion=eu-west-1",
    environment: "Production / EU"
  },
  {
    id: "CAS-2838",
    title: "SSO login loop for Okta users",
    customer: "Meridian Legal",
    contact: "Jordan Patel",
    accountTier: "Business",
    productArea: "Identity",
    reportedAt: "2026-11-12T08:11:00Z",
    channel: "Ticket",
    status: "investigating",
    description: "About 40 users in our Okta finance group authenticate successfully but return to the login page. The issue started after we updated the certificate yesterday. Other user groups seem unaffected.",
    logs: "saml_status=success\nacs_redirect=login\ncert_fingerprint_changed=true\naffected_users=40\nbrowser=chrome\nregion=us-east-1",
    environment: "Production / US"
  },
  {
    id: "CAS-2834",
    title: "Webhook retries create duplicate invoices",
    customer: "Orbit Services",
    contact: "Sam Rivera",
    accountTier: "Enterprise",
    productArea: "Integrations",
    reportedAt: "2026-11-12T07:48:00Z",
    channel: "Slack Connect",
    status: "new",
    description: "Our invoice endpoint received four copies of the same billing event. The endpoint took 18 seconds to respond during a traffic spike. We now have duplicate invoices in our ERP and need the safest recovery path.",
    logs: "http_status=200\ndelivery_attempt=3\nevent_id=evt_91bc\nendpoint_latency=18s\nduplicate_invoices=4",
    environment: "Production / Global"
  },
  {
    id: "CAS-2829",
    title: "Dashboard latency above SLO",
    customer: "Luma Health",
    contact: "Priya Shah",
    accountTier: "Growth",
    productArea: "Analytics",
    reportedAt: "2026-11-11T22:06:00Z",
    channel: "Ticket",
    status: "monitoring",
    description: "The executive dashboard is taking 25 to 40 seconds to render during our morning reporting window. The warehouse itself reports normal query time. High-cardinality campaign filters appear to be involved.",
    logs: "p95_render=32s\nwarehouse_wait=1.2s\nwidget_queries=46\ncache_hit=18%\nregion=us-west-2\nfilter_cardinality=high",
    environment: "Production / US"
  }
];
