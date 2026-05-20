CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  balance numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (date, description, amount, balance)
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON transactions
  FOR ALL USING (is_admin());
