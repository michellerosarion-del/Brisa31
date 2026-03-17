import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("store.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'seller'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    color TEXT,
    size TEXT,
    cost REAL,
    price REAL,
    stock INTEGER,
    min_stock INTEGER DEFAULT 5,
    brand TEXT,
    code TEXT,
    image_url TEXT,
    label TEXT,
    supplier_id INTEGER,
    date_added TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    product_id INTEGER,
    quantity INTEGER,
    type TEXT, -- 'entrada', 'venda', 'ajuste', 'reposicao'
    description TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    instagram TEXT,
    city TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    customer_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price REAL,
    total_value REAL,
    size TEXT,
    payment_method TEXT,
    seller_id INTEGER,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(seller_id) REFERENCES sellers(id)
  );

  CREATE TABLE IF NOT EXISTS sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    status TEXT DEFAULT 'ativo',
    commission_percentage REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS supplier_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    supplier TEXT,
    product_id INTEGER,
    quantity INTEGER,
    status TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    type TEXT,
    category TEXT,
    description TEXT,
    value REAL,
    observations TEXT
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT,
    investment REAL,
    sales_generated INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS configuracoes_loja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_loja TEXT DEFAULT 'Brisa 31',
    telefone_whatsapp TEXT DEFAULT '5511999999999',
    mensagem_padrao_whatsapp TEXT DEFAULT 'Olá! Tenho interesse neste produto: {nome_produto} - R$ {preco_produto}',
    monthly_goal REAL DEFAULT 10000,
    data_atualizacao TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    products_supplied TEXT,
    avg_purchase_price REAL
  );

  CREATE TABLE IF NOT EXISTS purchase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    supplier_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    value REAL,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  INSERT OR IGNORE INTO configuracoes_loja (id, nome_loja, telefone_whatsapp, mensagem_padrao_whatsapp) 
  VALUES (1, 'Brisa 31', '5511999999999', 'Olá! Tenho interesse neste produto: {nome_produto} - R$ {preco_produto}');
`);

// Migration: Add role to users if it doesn't exist
const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
if (!userColumns.find(c => c.name === 'role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'seller'");
}

// Migration: Add columns to products if they don't exist
const productColumns = db.prepare("PRAGMA table_info(products)").all() as any[];
if (!productColumns.find(c => c.name === 'min_stock')) {
  db.exec("ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 5");
}
if (!productColumns.find(c => c.name === 'brand')) {
  db.exec("ALTER TABLE products ADD COLUMN brand TEXT");
}
if (!productColumns.find(c => c.name === 'code')) {
  db.exec("ALTER TABLE products ADD COLUMN code TEXT");
}
if (!productColumns.find(c => c.name === 'label')) {
  db.exec("ALTER TABLE products ADD COLUMN label TEXT");
}
if (!productColumns.find(c => c.name === 'supplier_id')) {
  db.exec("ALTER TABLE products ADD COLUMN supplier_id INTEGER");
}
if (!productColumns.find(c => c.name === 'cash_price')) {
  db.exec("ALTER TABLE products ADD COLUMN cash_price REAL");
}
if (!productColumns.find(c => c.name === 'card_price')) {
  db.exec("ALTER TABLE products ADD COLUMN card_price REAL");
}
if (!productColumns.find(c => c.name === 'promo_price')) {
  db.exec("ALTER TABLE products ADD COLUMN promo_price REAL");
}
if (!productColumns.find(c => c.name === 'date_added')) {
  db.exec("ALTER TABLE products ADD COLUMN date_added TEXT DEFAULT CURRENT_TIMESTAMP");
}

// Migration: Add columns to sales if they don't exist
const salesColumns = db.prepare("PRAGMA table_info(sales)").all() as any[];
if (!salesColumns.find(c => c.name === 'unit_price')) {
  db.exec("ALTER TABLE sales ADD COLUMN unit_price REAL");
}
if (!salesColumns.find(c => c.name === 'size')) {
  db.exec("ALTER TABLE sales ADD COLUMN size TEXT");
}
if (!salesColumns.find(c => c.name === 'discount_value')) {
  db.exec("ALTER TABLE sales ADD COLUMN discount_value REAL DEFAULT 0");
}
if (!salesColumns.find(c => c.name === 'discount_type')) {
  db.exec("ALTER TABLE sales ADD COLUMN discount_type TEXT DEFAULT 'value'");
}
if (!salesColumns.find(c => c.name === 'final_price')) {
  db.exec("ALTER TABLE sales ADD COLUMN final_price REAL");
}
if (!salesColumns.find(c => c.name === 'profit')) {
  db.exec("ALTER TABLE sales ADD COLUMN profit REAL");
}
if (!salesColumns.find(c => c.name === 'sale_group_id')) {
  db.exec("ALTER TABLE sales ADD COLUMN sale_group_id TEXT");
}

// Migration: Ensure sellers table exists and has phone column
db.exec(`
  CREATE TABLE IF NOT EXISTS sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    status TEXT DEFAULT 'ativo',
    commission_percentage REAL DEFAULT 0
  );
`);

const sellerColumns = db.prepare("PRAGMA table_info(sellers)").all() as any[];
if (!sellerColumns.find(c => c.name === 'phone')) {
  db.exec("ALTER TABLE sellers ADD COLUMN phone TEXT");
}

// Migration: Ensure configuracoes_loja has monthly_goal
const settingsColumns = db.prepare("PRAGMA table_info(configuracoes_loja)").all() as any[];
if (!settingsColumns.find(c => c.name === 'monthly_goal')) {
  db.exec("ALTER TABLE configuracoes_loja ADD COLUMN monthly_goal REAL DEFAULT 10000");
}

// Migration: Ensure expenses table has all columns
const expenseColumns = db.prepare("PRAGMA table_info(expenses)").all() as any[];
if (!expenseColumns.find(c => c.name === 'category')) {
  db.exec("ALTER TABLE expenses ADD COLUMN category TEXT");
}
if (!expenseColumns.find(c => c.name === 'observations')) {
  db.exec("ALTER TABLE expenses ADD COLUMN observations TEXT");
}
if (!expenseColumns.find(c => c.name === 'date')) {
  db.exec("ALTER TABLE expenses ADD COLUMN date TEXT DEFAULT CURRENT_TIMESTAMP");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Não autorizado" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Sessão expirada" });
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(email, hashedPassword, name, role || 'seller');
      const token = jwt.sign({ id: info.lastInsertRowid, email, role: role || 'seller' }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, email, name, role: role || 'seller' } });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Email já cadastrado" });
      } else {
        res.status(500).json({ error: "Erro ao cadastrar usuário" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email, newPassword } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.status(404).json({ error: "Email não encontrado" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.put("/api/auth/profile", authenticateToken, async (req: any, res) => {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    // If changing password
    if (newPassword) {
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) return res.status(400).json({ error: "Senha atual incorreta" });
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?").run(name, email, hashedPassword, req.user.id);
    } else {
      db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, req.user.id);
    }

    res.json({ success: true });
  });

  // API Routes
  app.get("/api/products", (req, res) => {
    // Products are public for the catalog
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", authenticateToken, (req, res) => {
    const { name, category, color, size, cost, price, stock, min_stock, brand, code, image_url, cash_price, card_price, promo_price } = req.body;
    try {
      const transaction = db.transaction(() => {
        const info = db.prepare(`
          INSERT INTO products (name, category, color, size, cost, price, stock, min_stock, brand, code, image_url, cash_price, card_price, promo_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, category, color, size, cost, price, stock, min_stock || 5, brand, code, image_url, cash_price, card_price, promo_price);
        
        if (stock > 0) {
          db.prepare(`
            INSERT INTO stock_movements (product_id, quantity, type, description)
            VALUES (?, ?, ?, ?)
          `).run(info.lastInsertRowid, stock, 'entrada', 'Estoque inicial');
        }
        return info.lastInsertRowid;
      });
      const id = transaction();
      res.json({ id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", authenticateToken, (req, res) => {
    const { name, category, color, size, cost, price, stock, min_stock, brand, code, image_url, cash_price, card_price, promo_price } = req.body;
    try {
      const transaction = db.transaction(() => {
        const oldProduct = db.prepare("SELECT stock FROM products WHERE id = ?").get(req.params.id) as any;
        const stockDiff = stock - (oldProduct?.stock || 0);

        db.prepare(`
          UPDATE products SET name=?, category=?, color=?, size=?, cost=?, price=?, stock=?, min_stock=?, brand=?, code=?, image_url=?, cash_price=?, card_price=?, promo_price=?
          WHERE id=?
        `).run(name, category, color, size, cost, price, stock, min_stock || 5, brand, code, image_url, cash_price, card_price, promo_price, req.params.id);

        if (stockDiff !== 0) {
          db.prepare(`
            INSERT INTO stock_movements (product_id, quantity, type, description)
            VALUES (?, ?, ?, ?)
          `).run(req.params.id, stockDiff, 'ajuste', 'Atualização de cadastro');
        }
      });
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/customers", authenticateToken, (req, res) => {
    const today = new Date();
    const customers = db.prepare(`
      SELECT 
        c.*,
        COUNT(s.id) as total_purchases,
        SUM(s.total_value) as total_spent,
        MAX(s.date) as last_purchase
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id
      GROUP BY c.id
    `).all() as any[];

    const classifiedCustomers = customers.map(c => {
      let classification = 'normal';
      let status = 'ativo';
      
      if (c.last_purchase) {
        const lastDate = new Date(c.last_purchase);
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays > 60) status = 'inativo';
        else if (diffDays > 30) status = 'atenção';
        else status = 'ativo';
      } else {
        status = 'inativo';
      }

      if (c.total_spent > 1000) classification = 'VIP';
      else if (status === 'inativo') classification = 'inativo';

      return { ...c, classification, status };
    });

    res.json(classifiedCustomers);
  });

  app.post("/api/customers", authenticateToken, (req, res) => {
    const { name, phone, instagram, city } = req.body;
    const info = db.prepare(`
      INSERT INTO customers (name, phone, instagram, city)
      VALUES (?, ?, ?, ?)
    `).run(name, phone, instagram, city);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/customers/:id", authenticateToken, (req, res) => {
    const { name, phone, instagram, city } = req.body;
    db.prepare(`
      UPDATE customers SET name=?, phone=?, instagram=?, city=?
      WHERE id=?
    `).run(name, phone, instagram, city, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/customers/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/sales", authenticateToken, (req, res) => {
    const { customer_id, items, payment_method, seller_id, date, discount_value, discount_type, total_value, final_price } = req.body;
    const saleDate = date || new Date().toISOString().replace('T', ' ').split('.')[0];
    const saleGroupId = Math.random().toString(36).substring(2, 15);
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "A venda deve conter pelo menos um item." });
    }
    
    const cid = (customer_id && Number(customer_id) !== 0) ? Number(customer_id) : null;
    const sid = (seller_id && Number(seller_id) !== 0) ? Number(seller_id) : null;

    try {
      const transaction = db.transaction(() => {
        for (const item of items) {
          const pid = Number(item.product_id);
          const quantity = Number(item.quantity);
          const unit_price = Number(item.unit_price);
          const total_item_value = Number(item.total_item_value);
          const size = item.size;

          const product = db.prepare("SELECT stock, cost FROM products WHERE id = ?").get(pid) as any;
          if (!product || product.stock < quantity) {
            throw new Error(`Produto ${pid} sem estoque disponível.`);
          }

          const profit = total_item_value - (quantity * (product.cost || 0));

          db.prepare(`
            INSERT INTO sales (customer_id, product_id, quantity, unit_price, total_value, size, payment_method, seller_id, date, discount_value, discount_type, final_price, profit, sale_group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(cid, pid, quantity, unit_price, total_item_value, size, payment_method, sid, saleDate, discount_value || 0, discount_type || 'value', final_price || total_value, profit, saleGroupId);

          db.prepare(`
            UPDATE products SET stock = stock - ? WHERE id = ?
          `).run(quantity, pid);

          db.prepare(`
            INSERT INTO stock_movements (product_id, quantity, type, description)
            VALUES (?, ?, ?, ?)
          `).run(pid, -quantity, 'venda', `Venda #${saleGroupId}`);
        }
      });

      transaction();
      res.json({ success: true, sale_group_id: saleGroupId });
    } catch (error: any) {
      console.error("Error creating sale:", error);
      res.status(400).json({ error: error.message || "Erro ao registrar venda" });
    }
  });

  app.get("/api/stock-movements", authenticateToken, (req, res) => {
    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ORDER BY sm.date DESC
    `).all();
    res.json(movements);
  });

  app.post("/api/products/:id/adjust-stock", authenticateToken, (req, res) => {
    const { quantity, type, description } = req.body;
    const pid = req.params.id;
    
    try {
      const transaction = db.transaction(() => {
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, pid);
        db.prepare(`
          INSERT INTO stock_movements (product_id, quantity, type, description)
          VALUES (?, ?, ?, ?)
        `).run(pid, quantity, type || 'ajuste', description || 'Ajuste manual');
      });
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/backup", authenticateToken, (req, res) => {
    const tables = ['users', 'products', 'customers', 'sales', 'sellers', 'supplier_orders', 'expenses', 'ads', 'configuracoes_loja', 'suppliers', 'purchase_history', 'stock_movements'];
    const backup: any = {};
    for (const table of tables) {
      backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    res.json(backup);
  });

  app.post("/api/restore", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Apenas administradores podem restaurar backup" });
    }
    const backup = req.body;
    try {
      const transaction = db.transaction(() => {
        for (const table in backup) {
          db.prepare(`DELETE FROM ${table}`).run();
          const columns = Object.keys(backup[table][0]).join(', ');
          const placeholders = Object.keys(backup[table][0]).map(() => '?').join(', ');
          const insert = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
          for (const row of backup[table]) {
            insert.run(Object.values(row));
          }
        }
      });
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao restaurar backup: " + error.message });
    }
  });

  app.put("/api/sales/:id", authenticateToken, (req, res) => {
    const { customer_id, product_id, quantity, unit_price, total_value, size, payment_method, seller_id, date, discount_value, discount_type, final_price } = req.body;
    
    const cid = (customer_id && Number(customer_id) !== 0) ? Number(customer_id) : null;
    const sid = (seller_id && Number(seller_id) !== 0) ? Number(seller_id) : null;
    const pid = Number(product_id);

    try {
      const product = db.prepare("SELECT cost FROM products WHERE id = ?").get(pid) as any;
      const profit = (final_price || total_value) - (quantity * (product?.cost || 0));

      const transaction = db.transaction(() => {
        const oldSale = db.prepare("SELECT * FROM sales WHERE id = ?").get(req.params.id) as any;
        if (oldSale) {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(oldSale.quantity, oldSale.product_id);
        }

        db.prepare(`
          UPDATE sales SET customer_id=?, product_id=?, quantity=?, unit_price=?, total_value=?, size=?, payment_method=?, seller_id=?, date=?, discount_value=?, discount_type=?, final_price=?, profit=?
          WHERE id=?
        `).run(cid, pid, quantity, unit_price, total_value, size, payment_method, sid, date || oldSale?.date, discount_value || 0, discount_type || 'value', final_price || total_value, profit, req.params.id);

        db.prepare(`
          UPDATE products SET stock = stock - ? WHERE id = ?
        `).run(quantity, pid);
      });

      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ error: "Erro ao atualizar venda" });
    }
  });

  app.delete("/api/sales/:id", authenticateToken, (req, res) => {
    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(req.params.id);
    if (sale) {
      const transaction = db.transaction(() => {
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(sale.quantity, sale.product_id);
        db.prepare("DELETE FROM sales WHERE id = ?").run(req.params.id);
      });
      transaction();
    }
    res.json({ success: true });
  });

  app.get("/api/sales", authenticateToken, (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, p.name as product_name, c.name as customer_name, sel.name as seller_name,
             (s.total_value - (s.quantity * IFNULL(p.cost, 0))) as profit
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sellers sel ON s.seller_id = sel.id
      ORDER BY s.date DESC
    `).all();
    res.json(sales);
  });

  app.get("/api/supplier-orders", authenticateToken, (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, p.name as product_name 
      FROM supplier_orders o
      JOIN products p ON o.product_id = p.id
      ORDER BY o.date DESC
    `).all();
    res.json(orders);
  });

  app.post("/api/supplier-orders", authenticateToken, (req, res) => {
    const { supplier, product_id, quantity, status } = req.body;
    const info = db.prepare(`
      INSERT INTO supplier_orders (supplier, product_id, quantity, status)
      VALUES (?, ?, ?, ?)
    `).run(supplier, product_id, quantity, status);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/supplier-orders/:id", authenticateToken, (req, res) => {
    const { supplier, product_id, quantity, status } = req.body;
    db.prepare(`
      UPDATE supplier_orders SET supplier=?, product_id=?, quantity=?, status=?
      WHERE id=?
    `).run(supplier, product_id, quantity, status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/supplier-orders/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM supplier_orders WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/supplier-orders/:id", authenticateToken, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE supplier_orders SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/expenses", authenticateToken, (req, res) => {
    const expenses = db.prepare("SELECT * FROM expenses ORDER BY date DESC").all();
    res.json(expenses);
  });

  app.post("/api/expenses", authenticateToken, (req, res) => {
    try {
      const { type, category, description, value, observations, date } = req.body;
      const expenseDate = date || new Date().toISOString().replace('T', ' ').split('.')[0];
      const info = db.prepare(`
        INSERT INTO expenses (type, category, description, value, observations, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        type || null, 
        category || null, 
        description || null, 
        value || 0, 
        observations || null, 
        expenseDate
      );
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Erro ao registrar gasto: " + error.message });
    }
  });

  app.put("/api/expenses/:id", authenticateToken, (req, res) => {
    try {
      const { type, category, description, value, observations, date } = req.body;
      const oldExpense = db.prepare("SELECT date FROM expenses WHERE id = ?").get(req.params.id) as any;
      
      db.prepare(`
        UPDATE expenses SET type=?, category=?, description=?, value=?, observations=?, date=?
        WHERE id=?
      `).run(
        type || null, 
        category || null, 
        description || null, 
        value || 0, 
        observations || null, 
        date || oldExpense?.date || new Date().toISOString().replace('T', ' ').split('.')[0],
        req.params.id
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Erro ao atualizar gasto: " + error.message });
    }
  });

  // Sellers Routes
  app.get("/api/sellers", authenticateToken, (req, res) => {
    const sellers = db.prepare("SELECT * FROM sellers").all();
    res.json(sellers);
  });

  app.post("/api/sellers", authenticateToken, (req, res) => {
    try {
      const { name, email, phone, status, commission_percentage } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }
      const info = db.prepare(`
        INSERT INTO sellers (name, email, phone, status, commission_percentage)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, email, phone, status, commission_percentage);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      console.error("Error creating seller:", err);
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado para outro vendedor" });
      }
      res.status(500).json({ error: "Erro ao cadastrar vendedor: " + err.message });
    }
  });

  app.put("/api/sellers/:id", authenticateToken, (req, res) => {
    try {
      const { name, email, phone, status, commission_percentage } = req.body;
      db.prepare(`
        UPDATE sellers SET name=?, email=?, phone=?, status=?, commission_percentage=?
        WHERE id=?
      `).run(name, email, phone, status, commission_percentage, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating seller:", err);
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado para outro vendedor" });
      }
      res.status(500).json({ error: "Erro ao atualizar vendedor: " + err.message });
    }
  });

  app.delete("/api/sellers/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM sellers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/expenses/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/ads", authenticateToken, (req, res) => {
    const ads = db.prepare("SELECT * FROM ads ORDER BY date DESC").all();
    res.json(ads);
  });

  app.post("/api/ads", authenticateToken, (req, res) => {
    const { platform, investment, sales_generated, date } = req.body;
    const adDate = date || new Date().toISOString().replace('T', ' ').split('.')[0];
    
    db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO ads (platform, investment, sales_generated, date)
        VALUES (?, ?, ?, ?)
      `).run(platform, investment, sales_generated, adDate);

      // Also record as expense
      db.prepare(`
        INSERT INTO expenses (type, category, description, value, date)
        VALUES (?, ?, ?, ?, ?)
      `).run('Anúncio', platform, `Investimento em anúncios: ${platform}`, investment, adDate);
    })();
    
    res.json({ success: true });
  });

  app.put("/api/ads/:id", authenticateToken, (req, res) => {
    const { platform, investment, sales_generated, date } = req.body;
    db.prepare(`
      UPDATE ads SET platform=?, investment=?, sales_generated=?, date=?
      WHERE id=?
    `).run(platform, investment, sales_generated, date, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/ads/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM ads WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Suppliers
  app.get("/api/suppliers", authenticateToken, (req, res) => {
    const suppliers = db.prepare("SELECT * FROM suppliers").all();
    res.json(suppliers);
  });

  app.post("/api/suppliers", authenticateToken, (req, res) => {
    const { name, phone, email, address, products_supplied, avg_purchase_price } = req.body;
    const info = db.prepare(`
      INSERT INTO suppliers (name, phone, email, address, products_supplied, avg_purchase_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, phone, email, address, products_supplied, avg_purchase_price);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/suppliers/:id", authenticateToken, (req, res) => {
    const { name, phone, email, address, products_supplied, avg_purchase_price } = req.body;
    db.prepare(`
      UPDATE suppliers SET name=?, phone=?, email=?, address=?, products_supplied=?, avg_purchase_price=?
      WHERE id=?
    `).run(name, phone, email, address, products_supplied, avg_purchase_price, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/suppliers/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM suppliers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Purchase History
  app.get("/api/purchase-history", authenticateToken, (req, res) => {
    const history = db.prepare(`
      SELECT ph.*, s.name as supplier_name, p.name as product_name
      FROM purchase_history ph
      JOIN suppliers s ON ph.supplier_id = s.id
      JOIN products p ON ph.product_id = p.id
      ORDER BY ph.date DESC
    `).all();
    res.json(history);
  });

  app.post("/api/purchase-history", authenticateToken, (req, res) => {
    const { supplier_id, product_id, quantity, value, date } = req.body;
    const purchaseDate = date || new Date().toISOString().replace('T', ' ').split('.')[0];
    
    db.transaction(() => {
      db.prepare(`
        INSERT INTO purchase_history (supplier_id, product_id, quantity, value, date)
        VALUES (?, ?, ?, ?, ?)
      `).run(supplier_id, product_id, quantity, value, purchaseDate);
      
      db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);

      // Also record as expense
      const product = db.prepare("SELECT name FROM products WHERE id = ?").get(product_id) as any;
      const supplier = db.prepare("SELECT name FROM suppliers WHERE id = ?").get(supplier_id) as any;
      db.prepare(`
        INSERT INTO expenses (type, category, description, value, date)
        VALUES (?, ?, ?, ?, ?)
      `).run('Estoque', 'Compra', `Compra de estoque: ${product?.name || 'Produto'} (${supplier?.name || 'Fornecedor'})`, value, purchaseDate);
    })();
    
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM configuracoes_loja WHERE id = 1").get();
    res.json(settings || { id: 1, nome_loja: 'Brisa 31', telefone_whatsapp: '5511999999999', mensagem_padrao_whatsapp: 'Olá! Tenho interesse neste produto: {nome_produto} - R$ {preco_produto}', monthly_goal: 10000 });
  });

  app.put("/api/settings", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Apenas administradores podem alterar configurações" });
      }

      const { nome_loja, telefone_whatsapp, mensagem_padrao_whatsapp, monthly_goal } = req.body;
      const now = new Date().toISOString();
      
      const result = db.prepare(`
        UPDATE configuracoes_loja 
        SET nome_loja = ?, telefone_whatsapp = ?, mensagem_padrao_whatsapp = ?, monthly_goal = ?, data_atualizacao = ? 
        WHERE id = 1
      `).run(nome_loja, telefone_whatsapp, mensagem_padrao_whatsapp, monthly_goal, now);
      
      if (result.changes === 0) {
        db.prepare(`
          INSERT INTO configuracoes_loja (id, nome_loja, telefone_whatsapp, mensagem_padrao_whatsapp, monthly_goal, data_atualizacao) 
          VALUES (1, ?, ?, ?, ?, ?)
        `).run(nome_loja, telefone_whatsapp, mensagem_padrao_whatsapp, monthly_goal, now);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ error: "Erro ao atualizar configurações" });
    }
  });

  app.get("/api/dashboard", authenticateToken, (req: any, res) => {
    const toNum = (val: any) => {
      if (typeof val === 'string') {
        val = val.replace(',', '.');
      }
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };
    try {
      const today = (req.query.today as string) || new Date().toISOString().split('T')[0];
      const month = today.substring(0, 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const dailyRevenue = db.prepare("SELECT SUM(total_value) as val FROM sales WHERE date LIKE ?").get(`${today}%`).val || 0;
      const monthlyRevenue = db.prepare("SELECT SUM(total_value) as val FROM sales WHERE date LIKE ?").get(`${month}%`).val || 0;
      
      const totalSalesData = db.prepare(`
        SELECT 
          SUM(s.total_value) as revenue, 
          SUM(s.quantity * IFNULL(p.cost, 0)) as cost 
        FROM sales s 
        LEFT JOIN products p ON s.product_id = p.id
      `).get();

      const totalExpenses = db.prepare("SELECT SUM(value) as val FROM expenses").get().val || 0;
      const totalAdInvestment = db.prepare("SELECT SUM(investment) as val FROM ads").get().val || 0;

      const totalProfit = (toNum(totalSalesData.revenue)) - (toNum(totalSalesData.cost)) - toNum(totalExpenses) - toNum(totalAdInvestment);

      const lowStock = db.prepare("SELECT * FROM products WHERE stock <= min_stock").all();

      const topProducts = db.prepare(`
        SELECT 
          IFNULL(p.name, 'Produto Excluído') as name, 
          SUM(s.quantity) as total_sold,
          SUM(s.total_value) as revenue,
          SUM(s.total_value - (s.quantity * IFNULL(p.cost, 0))) as profit
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        GROUP BY s.product_id
        ORDER BY total_sold DESC
        LIMIT 10
      `).all();

      const mostProfitableProduct = db.prepare(`
        SELECT p.name, SUM(s.total_value - (s.quantity * IFNULL(p.cost, 0))) as profit
        FROM sales s
        JOIN products p ON s.product_id = p.id
        GROUP BY s.product_id
        ORDER BY profit DESC
        LIMIT 1
      `).get();

      const bestSellingSize = db.prepare(`
        SELECT size, COUNT(*) as count
        FROM sales
        WHERE size IS NOT NULL AND size != ''
        GROUP BY size
        ORDER BY count DESC
        LIMIT 1
      `).get();

      const monthlySalesCount = db.prepare("SELECT COUNT(*) as count FROM sales WHERE date LIKE ?").get(`${month}%`).count || 0;
      const ticketMedio = monthlySalesCount > 0 ? monthlyRevenue / monthlySalesCount : 0;

      const roi = totalAdInvestment > 0 ? ((monthlyRevenue - totalAdInvestment) / totalAdInvestment) * 100 : 0;

      const salesByMonth = db.prepare(`
        SELECT SUBSTR(date, 1, 7) as month, SUM(total_value) as revenue, COUNT(*) as count
        FROM sales
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `).all();

      const sellerStats = db.prepare(`
        SELECT 
          sel.id,
          sel.name, 
          SUM(IFNULL(s.total_value, 0)) as revenue,
          COUNT(s.id) as sales_count,
          SUM(IFNULL(s.total_value, 0) * (sel.commission_percentage / 100)) as commission
        FROM sellers sel
        LEFT JOIN sales s ON s.seller_id = sel.id
        WHERE sel.status = 'ativo'
        GROUP BY sel.id
        ORDER BY revenue DESC
      `).all();

      const stockSuggestions = db.prepare(`
        SELECT 
          p.id, p.name, p.stock,
          SUM(s.quantity) as sales_last_30
        FROM products p
        LEFT JOIN sales s ON p.id = s.product_id AND s.date >= ?
        GROUP BY p.id
        HAVING sales_last_30 > 0
      `).all(thirtyDaysAgoStr).map((p: any) => ({
        ...p,
        suggestion: Math.max(0, Math.ceil(p.sales_last_30 * 1.2) - p.stock)
      })).filter((p: any) => p.suggestion > 0);

      const settings = db.prepare("SELECT monthly_goal FROM configuracoes_loja WHERE id = 1").get() as any || { monthly_goal: 10000 };

      // New Metrics for the request
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const rev = db.prepare("SELECT SUM(total_value) as val FROM sales WHERE date LIKE ?").get(`${dateStr}%`).val || 0;
        last7Days.push({ date: dateStr, revenue: rev });
      }

      const salesByPaymentMethod = db.prepare(`
        SELECT payment_method as method, COUNT(*) as count
        FROM sales
        WHERE date LIKE ?
        GROUP BY payment_method
      `).all(`${month}%`);

      const monthlyCosts = db.prepare(`
        SELECT SUM(s.quantity * IFNULL(p.cost, 0)) as cost
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE s.date LIKE ?
      `).get(`${month}%`).cost || 0;

      const monthlyExpenses = db.prepare("SELECT SUM(value) as val FROM expenses WHERE date LIKE ?").get(`${month}%`).val || 0;
      const monthlyAds = db.prepare("SELECT SUM(investment) as val FROM ads WHERE date LIKE ?").get(`${month}%`).val || 0;
      const netProfit = toNum(monthlyRevenue) - toNum(monthlyCosts) - toNum(monthlyExpenses) - toNum(monthlyAds);

      const activeCustomers = db.prepare(`
        SELECT COUNT(DISTINCT customer_id) as count 
        FROM sales 
        WHERE date >= date('now', '-30 days') AND customer_id IS NOT NULL
      `).get().count || 0;
      
      const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers").get().count || 0;
      const inactiveCustomers = totalCustomers - activeCustomers;

      const bestSellingProductMonth = db.prepare(`
        SELECT p.name, SUM(s.quantity) as total_sold
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.date LIKE ?
        GROUP BY s.product_id
        ORDER BY total_sold DESC
        LIMIT 1
      `).get(`${month}%`);

      // Trending Product: Growth week-over-week
      const lastWeekSales = db.prepare(`
        SELECT product_id, SUM(quantity) as qty
        FROM sales
        WHERE date >= date('now', '-7 days')
        GROUP BY product_id
      `).all() as any[];

      const previousWeekSales = db.prepare(`
        SELECT product_id, SUM(quantity) as qty
        FROM sales
        WHERE date >= date('now', '-14 days') AND date < date('now', '-7 days')
        GROUP BY product_id
      `).all() as any[];

      let trendingProduct = null;
      let maxGrowth = -1;

      for (const current of lastWeekSales) {
        const prev = previousWeekSales.find(p => p.product_id === current.product_id);
        const prevQty = prev ? prev.qty : 0;
        const growth = prevQty === 0 ? current.qty : (current.qty - prevQty) / prevQty;
        
        if (growth > maxGrowth) {
          maxGrowth = growth;
          const p = db.prepare("SELECT name FROM products WHERE id = ?").get(current.product_id) as any;
          trendingProduct = { name: p?.name || 'N/A', growth: growth * 100 };
        }
      }

      const profitByProduct = db.prepare(`
        SELECT 
          p.name, 
          SUM(s.quantity) as quantity,
          SUM(s.total_value) as revenue,
          SUM(s.quantity * IFNULL(p.cost, 0)) as cost,
          SUM(s.total_value - (s.quantity * IFNULL(p.cost, 0))) as profit
        FROM sales s
        JOIN products p ON s.product_id = p.id
        GROUP BY s.product_id
        ORDER BY profit DESC
      `).all();

      const salesByColor = db.prepare(`
        SELECT p.color, SUM(s.quantity) as total_sold
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE p.color IS NOT NULL AND p.color != ''
        GROUP BY p.color
        ORDER BY total_sold DESC
        LIMIT 10
      `).all();

      const salesBySize = db.prepare(`
        SELECT s.size, SUM(s.quantity) as total_sold
        FROM sales s
        WHERE s.size IS NOT NULL AND s.size != ''
        GROUP BY s.size
        ORDER BY total_sold DESC
        LIMIT 10
      `).all();

      const staleProducts = db.prepare(`
        SELECT p.id, p.name, p.brand, p.color, p.size, p.stock, p.date_added
        FROM products p
        WHERE p.id NOT IN (
          SELECT product_id FROM sales WHERE date >= date('now', '-30 days')
        )
        AND p.stock > 0
        ORDER BY p.date_added ASC
        LIMIT 10
      `).all();

      res.json({
        dailyRevenue,
        monthlyRevenue,
        totalProfit,
        netProfit,
        lowStock,
        topProducts,
        mostProfitableProduct,
        bestSellingSize,
        salesBySize,
        staleProducts,
        ticketMedio,
        roi,
        salesByMonth,
        sellerStats,
        monthlySalesCount,
        stockSuggestions,
        monthlyGoal: settings.monthly_goal,
        revenueLast7Days: last7Days,
        salesByPaymentMethod,
        salesByColor,
        customerStats: { active: activeCustomers, inactive: inactiveCustomers },
        bestSellingProductMonth,
        trendingProduct,
        profitByProduct
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Erro ao carregar dashboard" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
