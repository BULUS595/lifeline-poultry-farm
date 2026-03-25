# Supabase Database Setup Guide

This guide shows how to set up your Supabase PostgreSQL database for the Life-Line Poultry Solutions PWA.

## 📋 Prerequisites

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. **Create a Project** - Choose PostgreSQL 15+
3. **Copy Credentials** - Get URL and Anon Key from Settings → API

## 🔧 Setup Steps

### Step 1: Create Database Tables

Copy and paste this SQL into `SQL Editor` in Supabase:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'manager', 'sales_staff', 'inventory_staff', 'accountant', 'auditor', 'worker')),
  farm_ids TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  UNIQUE(email)
);

-- Farms table
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  total_birds INTEGER DEFAULT 0,
  bird_type VARCHAR(100),
  managed_by UUID REFERENCES users(id),
  staff_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mortality logs table
CREATE TABLE mortality_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  count INTEGER NOT NULL,
  cause VARCHAR(100),
  notes TEXT,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feeding logs table
CREATE TABLE feeding_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  time TIME,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  feed_type VARCHAR(100),
  notes TEXT,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicine schedules table
CREATE TABLE medicine_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  medicine_type VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  frequency VARCHAR(50),
  end_date DATE,
  dosage TEXT,
  assigned_to TEXT[] NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medicine completions table
CREATE TABLE medicine_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES medicine_schedules(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  farm_id UUID NOT NULL REFERENCES farms(id),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  buyer VARCHAR(255),
  notes TEXT,
  receipt_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  farm_id UUID NOT NULL REFERENCES farms(id),
  action VARCHAR(50),
  data_type VARCHAR(100),
  data_id VARCHAR(255),
  changes JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to TEXT[] NOT NULL,
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_mortality_logs_farm ON mortality_logs(farm_id);
CREATE INDEX idx_mortality_logs_worker ON mortality_logs(worker_id);
CREATE INDEX idx_mortality_logs_date ON mortality_logs(date);

CREATE INDEX idx_feeding_logs_farm ON feeding_logs(farm_id);
CREATE INDEX idx_feeding_logs_worker ON feeding_logs(worker_id);
CREATE INDEX idx_feeding_logs_date ON feeding_logs(date);

CREATE INDEX idx_expenses_farm ON expenses(farm_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_farms_managed_by ON farms(managed_by);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_farm ON activity_logs(farm_id);
```

### Step 2: Enable Row Level Security (RLS)

RLS ensures users can only access their data. Enable it for each table:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortality_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### Step 3: Create RLS Policies

```sql
-- Users: Users can see their own profile
CREATE POLICY user_read_own ON users
  FOR SELECT USING (auth.uid() = id);

-- Users: Super admins can see all profiles
CREATE POLICY user_read_admin ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users: Allow admins to insert and update
CREATE POLICY user_admin_all ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Farms: Users can see farms they manage or are staff on
CREATE POLICY farm_access ON farms
  FOR SELECT USING (
    auth.uid() = managed_by OR 
    auth.uid()::text = ANY(staff_ids)
  );

-- Mortality logs: Users can see their farm's logs
CREATE POLICY mortality_access ON mortality_logs
  FOR ALL USING (
    farm_id IN (
      SELECT id FROM farms 
      WHERE auth.uid() = managed_by OR auth.uid()::text = ANY(staff_ids)
    )
  );

-- Feeding logs: Users can see their farm's logs
CREATE POLICY feeding_access ON feeding_logs
  FOR ALL USING (
    farm_id IN (
      SELECT id FROM farms 
      WHERE auth.uid() = managed_by OR auth.uid()::text = ANY(staff_ids)
    )
  );

-- Expenses: Only managers and admins can insert
CREATE POLICY expenses_insert ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY expenses_select ON expenses
  FOR SELECT USING (
    farm_id IN (
      SELECT id FROM farms 
      WHERE auth.uid() = managed_by OR auth.uid()::text = ANY(staff_ids)
    )
  );

-- Activity logs: Users can see their farm's activity
CREATE POLICY activity_access ON activity_logs
  FOR SELECT USING (
    farm_id IN (
      SELECT id FROM farms 
      WHERE auth.uid() = managed_by OR auth.uid()::text = ANY(staff_ids)
    )
  );
```

### Step 4: Configure Environment Variables

1. Create `.env` file in project root:
   ```bash
   cp .env.example .env
   ```

2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://[your-project-id].supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Get credentials from:
   - Login to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy `Project URL` and `anon public` key

### Step 5: Test the Database Connection

Run the dev server:
```bash
npm run dev
```

Check browser console for any errors. If connection successful, you should see Supabase initialized.

## 🔐 Authentication Setup

### Enable Email/Password Authentication

1. Go to Supabase Dashboard
2. Authentication → Providers
3. Enable "Email" provider
4. Set email templates (optional)

### Create Test User

In Supabase Dashboard:
1. Authentication → Users
2. Click "Add User"
3. Email: `admin@lifeline.local`
4. Password: `password123`
5. Click "Create User"

Then insert corresponding user in your database:

```sql
INSERT INTO users (id, email, name, role, farm_ids, is_active)
VALUES (
  '[UUID-FROM-AUTH]',
  'admin@lifeline.local',
  'Admin User',
  'super_admin',
  '{}',
  true
);
```

Get the UUID from Authentication → Users in console.

## 📊 Database Backup

### Automatic Backups
- Supabase automatically backs up daily
- Go to Project Settings → Backups to view/restore

### Manual Export
```bash
# Export as SQL
pg_dump \
  postgres://[user]:[password]@[host]/[database] \
  > backup.sql
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] RLS policies enabled on all tables
- [ ] Indexes created for performance
- [ ] Authentication configured
- [ ] Environment variables set
- [ ] Test user created
- [ ] Backup scheduled
- [ ] Custom domain configured (optional)
- [ ] HTTPS enforced

## 📚 Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)

## ⚠️ Common Issues

### "anon key not found"
**Solution**: Check `.env` file has `VITE_SUPABASE_ANON_KEY` set correctly

### "Connection refused"
**Solution**: Check `VITE_SUPABASE_URL` is correct and project is active

### "RLS violation"
**Solution**: Check RLS policies allow user access to table

### "Relations don't exist"
**Solution**: Run SQL table creation script again, check for errors

---

**All set! Your Supabase database is ready.** 🎉

---

## 🛍️ Step X: Live Stock System Tables

Run this SQL in the Supabase SQL Editor to enable the Live Stock & Sales terminal.

```sql
-- ============================================================
-- STOCK ITEMS TABLE (Inventory Staff manages this)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  quantity      DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit_price    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  unit          VARCHAR(50) DEFAULT 'units',
  min_threshold DECIMAL(10, 2) DEFAULT 10,
  last_updated  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  farm_id       TEXT NOT NULL DEFAULT 'farm-1'
);

-- Enable REALTIME so Sales Staff see price/qty changes instantly
ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;

-- Row Level Security
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can READ stock
CREATE POLICY "Authenticated users can view stock"
  ON stock_items FOR SELECT
  TO authenticated
  USING (true);

-- Only inventory staff, managers, and admins can modify stock
CREATE POLICY "Inventory staff can manage stock"
  ON stock_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'manager', 'inventory_staff')
    )
  );

-- ============================================================
-- RETAIL SALES TABLE (Sales Staff creates sales here)
-- ============================================================
CREATE TABLE IF NOT EXISTS retail_sales (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number   VARCHAR(100) UNIQUE NOT NULL,
  items            JSONB NOT NULL DEFAULT '[]',
  total_price      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method   VARCHAR(50) NOT NULL DEFAULT 'cash',
  customer_name    VARCHAR(255),
  salesperson_id   UUID REFERENCES users(id),
  farm_id          TEXT NOT NULL DEFAULT 'farm-1',
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE retail_sales ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read sales
CREATE POLICY "Authenticated users can view retail sales"
  ON retail_sales FOR SELECT
  TO authenticated
  USING (true);

-- Sales staff can create sales
CREATE POLICY "Authenticated users can create retail sales"
  ON retail_sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- SEED: Insert some sample stock items (optional)
-- ============================================================
INSERT INTO stock_items (name, quantity, unit_price, unit, min_threshold, farm_id)
VALUES
  ('Live Broiler Chicken', 200, 4500, 'birds', 20, 'farm-1'),
  ('Fresh Eggs (Crate)', 80, 1800, 'crates', 10, 'farm-1'),
  ('Dressed Chicken (1kg)', 150, 3200, 'kg', 15, 'farm-1'),
  ('Chicken Feet (1kg)', 100, 800, 'kg', 10, 'farm-1'),
  ('Offals Pack', 60, 600, 'packs', 5, 'farm-1')
ON CONFLICT DO NOTHING;
```

> **Note**: After running this SQL, the Stock Management page and Sales Terminal will be fully functional with real-time sync enabled.
