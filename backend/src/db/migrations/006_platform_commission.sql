-- Platform revenue tracking: catat komisi yang dipotong dari setiap completed order
CREATE TABLE IF NOT EXISTS platform_revenue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type   VARCHAR(20) NOT NULL CHECK (order_type IN ('survey', 'moving')),
  order_id     TEXT NOT NULL,
  gross_amount BIGINT NOT NULL,
  commission   BIGINT NOT NULL,
  rate         NUMERIC(5,4) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_order_type ON platform_revenue(order_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at ON platform_revenue(created_at DESC);
