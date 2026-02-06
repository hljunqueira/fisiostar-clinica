-- Financial Module Schema
-- Tables for payments tracking and expense management

-- ========================================
-- PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sessions INTEGER NOT NULL,
  amount_per_session DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP,
  paid_by UUID REFERENCES system_users(id),
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'pix', 'check')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_professional ON payments(professional_id);
CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- ========================================
-- EXPENSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('rent', 'utilities', 'supplies', 'maintenance', 'salaries', 'marketing', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP,
  created_by UUID REFERENCES system_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_unit ON expenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_paid ON expenses(paid);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies for payments (only authenticated users, refine later for admin-only)
CREATE POLICY payments_select_policy ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY payments_insert_policy ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY payments_update_policy ON payments
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for expenses (only authenticated users, refine later for admin-only)
CREATE POLICY expenses_select_policy ON expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY expenses_insert_policy ON expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY expenses_update_policy ON expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY expenses_delete_policy ON expenses
  FOR DELETE USING (auth.role() = 'authenticated');

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE payments IS 'Tracks professional payments by period';
COMMENT ON TABLE expenses IS 'Tracks clinic expenses by category';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, paid, or cancelled';
COMMENT ON COLUMN payments.payment_method IS 'How payment was made: cash, bank_transfer, pix, or check';
COMMENT ON COLUMN expenses.category IS 'Expense category: rent, utilities, supplies, maintenance, salaries, marketing, or other';
