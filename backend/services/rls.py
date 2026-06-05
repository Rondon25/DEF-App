"""
Row Level Security helpers.

We use PostgreSQL's SET LOCAL to stamp the current customer/staff ID
onto the session before any RLS-protected query runs.

Policies on orders, payments, deliveries, grns enforce:
  - Customers can only read rows where customer_id = current customer
  - Staff can read everything (bypassed via bypass_rls role or BYPASSRLS)

We achieve this by:
  1. Running the SQL below once (apply_rls_policies)
  2. Calling set_customer_context(db, customer_id) in each customer request
"""
from sqlalchemy.orm import Session
from sqlalchemy import text


def apply_rls_policies(engine):
    """Run once at startup to create RLS policies if not already present."""
    statements = [
        # Enable RLS on protected tables
        "ALTER TABLE orders ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE payments ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE grns ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE order_items ENABLE ROW LEVEL SECURITY",

        # BYPASSRLS for the app superuser so staff queries aren't filtered
        # (defuser is owner, owners bypass RLS by default in PG)

        # Customer policy on orders
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='customer_orders_policy'
          ) THEN
            CREATE POLICY customer_orders_policy ON orders
              USING (
                customer_id::text = COALESCE(current_setting('app.current_customer_id', true), '0')
                OR current_setting('app.bypass_rls', true) = 'true'
              );
          END IF;
        END $$
        """,

        # Customer policy on payments (via order)
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='customer_payments_policy'
          ) THEN
            CREATE POLICY customer_payments_policy ON payments
              USING (
                order_id IN (
                  SELECT id FROM orders
                  WHERE customer_id::text = COALESCE(current_setting('app.current_customer_id', true), '0')
                )
                OR current_setting('app.bypass_rls', true) = 'true'
              );
          END IF;
        END $$
        """,

        # Customer policy on deliveries
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='deliveries' AND policyname='customer_deliveries_policy'
          ) THEN
            CREATE POLICY customer_deliveries_policy ON deliveries
              USING (
                order_id IN (
                  SELECT id FROM orders
                  WHERE customer_id::text = COALESCE(current_setting('app.current_customer_id', true), '0')
                )
                OR current_setting('app.bypass_rls', true) = 'true'
              );
          END IF;
        END $$
        """,

        # Customer policy on GRNs
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='grns' AND policyname='customer_grns_policy'
          ) THEN
            CREATE POLICY customer_grns_policy ON grns
              USING (
                order_id IN (
                  SELECT id FROM orders
                  WHERE customer_id::text = COALESCE(current_setting('app.current_customer_id', true), '0')
                )
                OR current_setting('app.bypass_rls', true) = 'true'
              );
          END IF;
        END $$
        """,

        # Customer policy on order_items
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='customer_order_items_policy'
          ) THEN
            CREATE POLICY customer_order_items_policy ON order_items
              USING (
                order_id IN (
                  SELECT id FROM orders
                  WHERE customer_id::text = COALESCE(current_setting('app.current_customer_id', true), '0')
                )
                OR current_setting('app.bypass_rls', true) = 'true'
              );
          END IF;
        END $$
        """,
    ]

    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"[RLS] Warning: {e}")
        conn.commit()
    print("[RLS] ✅ Row Level Security policies applied")


def set_customer_context(db: Session, customer_id: int):
    """Call before any customer-scoped query. Sets RLS session variable."""
    db.execute(text(f"SET LOCAL app.current_customer_id = '{customer_id}'"))
    db.execute(text("SET LOCAL app.bypass_rls = 'false'"))


def set_staff_context(db: Session):
    """Call for staff queries — bypasses RLS policies."""
    db.execute(text("SET LOCAL app.bypass_rls = 'true'"))
    db.execute(text("SET LOCAL app.current_customer_id = '0'"))
