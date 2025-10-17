const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Papa = require('papaparse');  // For CSV parsing
const xlsx = require('xlsx');       // For Excel parsing
const nodemailer = require('nodemailer'); // import at top
const jwt = require('jsonwebtoken');


dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const app = express();
const PORT = 3000;


// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg',          // images
      'text/csv',                                       // CSV
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // XLSX
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, CSV, XLSX allowed'));
  }
});

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});


const promisePool = pool.promise();
// const db = pool; 
const db = pool.promise(); // <-- convert pool to promise-compatible

// Middleware

// CORS middleware
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadDir));

// ✅ Debugging: log all incoming requests
app.use((req, res, next) => {
  console.log("👉 Incoming request:", req.method, req.url);
  if (req.method !== "GET") {
    console.log("📦 Body:", req.body);
  }
  next();
});

// Test DB connection on startup
pool.getConnection((err, conn) => {
  if (err) {
    console.error('MySQL connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to MySQL');
  conn.release();
});

function validateEmployeeFields(req, res, next) {
  const firstname = req.body.firstname || req.body.firstName;

  const lastName = req.body.lastName || req.body.lastname || req.body.LastName || req.body.LASTNAME;

  const email = req.body.email;

  if (!firstname || !lastName || !email) {
    return res.status(400).json({ error: 'Missing firstname, lastName, or email' });
  }

  req.body.firstname = firstname;
  req.body.lastName = lastName;

  next();
}

//------------------------------// Register ---------------------------------

// Login API


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user by email only
    const [results] = await promisePool.query(
      `SELECT u.id, u.name, u.email, u.employee_id, u.role_id, r.roleName, u.password,
          IFNULL(p.can_leave_action, 0) AS can_leave_action,
          IFNULL(p.can_salary_action, 0) AS can_salary_action,
          IFNULL(p.can_employee_action, 0) AS can_employee_action,
           IFNULL(p.can_department_action, 0) AS can_department_action,
  IFNULL(p.can_attendance_action, 0) AS can_attendance_action,
  IFNULL(p.can_report_action, 0) AS can_report_action
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN user_salary_permissions p ON u.id = p.user_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    if (results.length === 0) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    const user = results[0];

    // Compare passwords: handle plain text (legacy) and hashed
    let passwordMatch = false;
    if (user.password.startsWith('$2b$')) {
      // bcrypt hashed password
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // plain text password
      passwordMatch = password === user.password;
    }

    if (!passwordMatch) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    delete user.password;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.roleName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, message: 'Login successful', user, token });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Login error' });
  }
});

// Get Line Managers only
app.get('/api/line-managers', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.roleName = 'Line Manager'
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching line managers:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch line managers' });
  }
});

//----------------------------------------------------------

app.get('/api/permissions', async (req, res) => {
  try {
    const [users] = await promisePool.query(`
      SELECT u.id, u.name, r.roleName,
             IFNULL(p.can_salary_action, 0) as can_salary_action,
             IFNULL(p.can_leave_action, 0) as can_leave_action,
             IFNULL(p.can_employee_action, 0) as can_employee_action,
              IFNULL(p.can_department_action, 0) as can_department_action,
               IFNULL(p.can_attendance_action, 0) as can_attendance_action,
                 IFNULL(p.can_report_action, 0) AS can_report_action
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_salary_permissions p ON u.id = p.user_id
    `);
    res.json(users);
  } catch (err) {
    console.error('Failed to fetch users:', err.message);
    res.status(500).json({ success: false });
  }
});

// Single user permissions
app.get('/api/permissions/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const [rows] = await promisePool.query(
      `SELECT u.id, u.name, r.roleName,
        IFNULL(p.can_salary_action, 0) as can_salary_action,
        IFNULL(p.can_leave_action, 0) as can_leave_action,
        IFNULL(p.can_employee_action, 0) as can_employee_action,
        IFNULL(p.can_department_action, 0) as can_department_action,
        IFNULL(p.can_attendance_action, 0) as can_attendance_action,
        IFNULL(p.can_report_action, 0) as can_report_action
 FROM users u
 JOIN roles r ON u.role_id = r.id
 LEFT JOIN user_salary_permissions p ON u.id = p.user_id
 WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Fetch user permissions error:', err.message);
    res.status(500).json({ success: false });
  }
});

app.post('/api/permissions/update/salary', async (req, res) => {
  try {
    const { userId, can_salary_action } = req.body;

    const [existing] = await promisePool.query(
      'SELECT * FROM user_salary_permissions WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await promisePool.query(
        'UPDATE user_salary_permissions SET can_salary_action = ? WHERE user_id = ?',
        [can_salary_action ? 1 : 0, userId]
      );
    } else {
      await promisePool.query(
        'INSERT INTO user_salary_permissions (user_id, can_salary_action) VALUES (?, ?)',
        [userId, can_salary_action ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Salary permission update error:', err.message);
    res.status(500).json({ success: false });
  }
});


app.post('/api/permissions/update/leave', async (req, res) => {
  try {
    const { userId, can_leave_action } = req.body;

    const [existing] = await promisePool.query(
      'SELECT * FROM user_salary_permissions WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await promisePool.query(
        'UPDATE user_salary_permissions SET can_leave_action = ? WHERE user_id = ?',
        [can_leave_action ? 1 : 0, userId]
      );
    } else {
      await promisePool.query(
        'INSERT INTO user_salary_permissions (user_id, can_leave_action) VALUES (?, ?)',
        [userId, can_leave_action ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Leave permission update error:', err.message);
    res.status(500).json({ success: false });
  }
});

app.post('/api/permissions/update/employee', async (req, res) => {
  try {
    const { userId, can_employee_action } = req.body;

    const [existing] = await promisePool.query(
      'SELECT * FROM user_salary_permissions WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // update
      await promisePool.query(
        'UPDATE user_salary_permissions SET can_employee_action = ? WHERE user_id = ?',
        [can_employee_action ? 1 : 0, userId]
      );
    } else {
      // insert with all fields
      await promisePool.query(
        `INSERT INTO user_salary_permissions 
         (user_id, can_salary_action, can_leave_action, can_employee_action) 
         VALUES (?, 0, 0, ?)`,
        [userId, can_employee_action ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Employee permission update error:', err.message);
    res.status(500).json({ success: false });
  }
});

// Department Permission Update
app.post("/api/permissions/update/department", async (req, res) => {
  try {
    const { userId, can_department_action } = req.body;

    if (typeof userId === "undefined") {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Update query
    await promisePool.query(
      `UPDATE user_salary_permissions 
       SET can_department_action = ? 
       WHERE user_id = ?`,
      [can_department_action ? 1 : 0, userId]
    );

    res.json({ success: true, message: "Department permission updated successfully" });
  } catch (err) {
    console.error("Error updating department permission:", err);
    res.status(500).json({ error: "Failed to update department permission" });
  }
});

// Attendance Permission Update
app.post("/api/permissions/update/attendance", async (req, res) => {
  try {
    const { userId, can_attendance_action } = req.body;

    const [existing] = await promisePool.query(
      'SELECT * FROM user_salary_permissions WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await promisePool.query(
        'UPDATE user_salary_permissions SET can_attendance_action = ? WHERE user_id = ?',
        [can_attendance_action ? 1 : 0, userId]
      );
    } else {
      await promisePool.query(
        `INSERT INTO user_salary_permissions
        (user_id, can_salary_action, can_leave_action, can_employee_action, can_department_action, can_attendance_action)
        VALUES (?, 0, 0, 0, 0, ?)`,
        [userId, can_attendance_action ? 1 : 0]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Attendance permission update error:', err.message);
    res.status(500).json({ success: false });
  }
});

app.get('/api/attendance/employee/:id', (req, res) => {
  const employeeId = req.params.id;
  const sql = 'SELECT * FROM attendance WHERE empId = ? ORDER BY date DESC';

  db.query(sql, [employeeId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching attendance:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Report Permission Update
app.post("/api/permissions/update/report", async (req, res) => {
  try {
    const { userId, can_report_action } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId" });
    }

    // Check if user already has a permissions record
    const [existing] = await promisePool.query(
      "SELECT * FROM user_salary_permissions WHERE user_id = ?",
      [userId]
    );

    if (existing.length > 0) {
      // Update existing record
      await promisePool.query(
        "UPDATE user_salary_permissions SET can_report_action = ? WHERE user_id = ?",
        [can_report_action ? 1 : 0, userId]
      );
    } else {
      // Insert new record with default 0s for other columns
      await promisePool.query(
        `INSERT INTO user_salary_permissions 
         (user_id, can_salary_action, can_leave_action, can_employee_action, can_department_action, can_attendance_action, can_report_action)
         VALUES (?, 0, 0, 0, 0, 0, ?)`,
        [userId, can_report_action ? 1 : 0]
      );
    }

    res.json({ success: true, message: "Report permission updated successfully" });
  } catch (err) {
    console.error("Report permission update error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update report permission" });
  }
});

// --------------------- Employee Routes ---------------------


// Helper to safely parse dates
function parseDate(str) {
  if (!str) return null;

  // If already YYYY-MM-DD, keep as string
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Convert from DD-MM-YYYY
  const [day, month, year] = str.split('-');
  if (!day || !month || !year) return null;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // string only
}

async function getEmployeeById(id) {
  const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
  return rows[0];
}

async function getSalaryByEmployeeId(employeeId) {
  const [rows] = await db.query('SELECT * FROM salary WHERE employee_id = ?', [employeeId]);
  return rows[0];
}


// Create Employee
app.post('/api/employees', upload.single('image'), validateEmployeeFields, async (req, res) => {
  try {
    const {
      firstname, lastName, email, phone, dob, address, inviteEmail,
      office, joiningDate, position, team, employmentType, countryOfEmployment,
      lineManager, currency, salary, departmentId, status,
      bankName, bankAccountNo, ifscCode, bankAddress, gender, aadharNo, panCard, fathersName
    } = req.body;

    // Parse date fields safely as strings
    const dobValue = parseDate(dob);
    const joiningDateValue = parseDate(joiningDate);

    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const allowedGenders = ['Male', 'Female', 'Other'];
    const genderValue = allowedGenders.includes(gender) ? gender : null;
    const name = `${firstname} ${lastName}`;

    const sql = `
      INSERT INTO employees (
        firstname, lastName, email, phone, dob, address, inviteEmail,
        office, joiningDate, position, team, employmentType, countryOfEmployment, lineManager,
        currency, salary, departmentId, status, name,
        bankName, bankAccountNo, ifscCode, bankAddress, gender, image,
        aadharNo, panCard, fathersName
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await promisePool.query(sql, [
      firstname, lastName, email, phone || null,
      dobValue,  // ✅ saved as string
      address || null,
      inviteEmail === 'true' || inviteEmail === true ? 1 : 0,
      office || null,
      joiningDateValue, // ✅ saved as string
      position || null,
      team || null,
      employmentType || null,
      countryOfEmployment || null,
      lineManager || null,
      currency || null,
      Number(salary) || 0,
      Number(departmentId) || 1,
      status || 'Active',
      name,
      bankName || null,
      bankAccountNo || null,
      ifscCode || null,
      bankAddress || null,
      genderValue,
      image,
      aadharNo || null,
      panCard || null,
      fathersName || null
    ]);

    res.status(201).json({ message: 'Employee added successfully', id: result.insertId });
  } catch (err) {
    console.error('❌ Error creating employee:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get All Employees
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM employees');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT id, firstname, lastName,
              DATE_FORMAT(dob, '%Y-%m-%d') AS dob,
              DATE_FORMAT(joiningDate, '%Y-%m-%d') AS joiningDate,
              email, phone, address, inviteEmail, office, position, team,
              employmentType, countryOfEmployment, lineManager, currency, salary,
              departmentId, status, name, bankName, bankAccountNo, ifscCode, bankAddress, gender,
              image, aadharNo, panCard, fathersName
       FROM employees
       WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching employee:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update Employee
app.put('/api/employees/:id', upload.single('image'), validateEmployeeFields, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstname, lastName, email, phone, dob, address, inviteEmail,
      office, joiningDate, position, team, employmentType, countryOfEmployment,
      lineManager, currency, salary, departmentId, status,
      bankName, bankAccountNo, ifscCode, bankAddress, gender, image: existingImage, aadharNo, panCard, fathersName
    } = req.body;

    const image = req.file ? `/uploads/${req.file.filename}` : existingImage;
    const allowedGenders = ['Male', 'Female', 'Other'];
    const genderValue = allowedGenders.includes(gender) ? gender : null;
    const name = `${firstname} ${lastName}`;

    // Parse dates as strings
    const dobValue = parseDate(dob);
    const joiningDateValue = parseDate(joiningDate);

    const sql = `UPDATE employees SET
      firstname = ?, lastName = ?, email = ?, phone = ?, dob = ?, address = ?, inviteEmail = ?,
      office = ?, joiningDate = ?, position = ?, team = ?, employmentType = ?, countryOfEmployment = ?, lineManager = ?,
      currency = ?, salary = ?, departmentId = ?, status = ?, name = ?,
      bankName = ?, bankAccountNo = ?, ifscCode = ?, bankAddress = ?, gender = ?, image = ?, aadharNo = ?, panCard = ?, fathersName = ?
      WHERE id = ?`;

    const [result] = await promisePool.query(sql, [
      firstname, lastName, email, phone || null,
      dobValue,  // ✅ string only
      address || null,
      inviteEmail === 'true' || inviteEmail === true ? 1 : 0,
      office || null,
      joiningDateValue, // ✅ string only
      position || null,
      team || null,
      employmentType || null,
      countryOfEmployment || null,
      lineManager || null,
      currency || null,
      Number(salary) || 0,
      Number(departmentId) || 1,
      status || 'Active',
      name,
      bankName || null,
      bankAccountNo || null,
      ifscCode || null,
      bankAddress || null,
      genderValue,
      image,
      aadharNo || null,
      panCard || null,
      fathersName || null,
      id
    ]);

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Employee not found' });

    // Fetch updated employee
    const [rows] = await promisePool.query(
      `SELECT id, firstname, lastName,
              DATE_FORMAT(dob, '%Y-%m-%d') AS dob,
              DATE_FORMAT(joiningDate, '%Y-%m-%d') AS joiningDate,
              email, phone, address, inviteEmail, office, position, team,
              employmentType, countryOfEmployment, lineManager, currency, salary,
              departmentId, status, name, bankName, bankAccountNo, ifscCode, bankAddress, gender,
              image, aadharNo, panCard, fathersName
       FROM employees
       WHERE id = ?`,
      [id]
    );

    res.json({ message: 'Employee updated successfully', employee: rows[0] });

  } catch (err) {
    console.error('Error updating employee:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update only employee status
app.put('/api/employees/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const [result] = await promisePool.query(
      'UPDATE employees SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error('Error updating employee status:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete Employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    // Delete image file from disk if exists
    const [rows] = await promisePool.query('SELECT image FROM employees WHERE id = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].image) {
      const imagePath = rows[0].image.startsWith('/') ? rows[0].image.slice(1) : rows[0].image;
      const filePath = path.join(__dirname, imagePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await promisePool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.post('/api/salary/:employeeId/salary-certificate', async (req, res) => {
  const employeeId = req.params.employeeId;
  try {
    console.log('employeeId:', employeeId);

    const employee = await getEmployeeById(employeeId);
    console.log('Employee:', employee);

    const salary = await getSalaryByEmployeeId(employeeId);
    console.log('Salary:', salary);

    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!salary) return res.status(404).json({ message: 'Salary not found' });
    if (!employee.email) return res.status(400).json({ message: 'Employee email missing' });

    const html = `
      <h1>Salary Certificate</h1>
      <p><strong>Name:</strong> ${employee.firstname} ${employee.lastName}</p>
      <p><strong>Employee ID:</strong> ${employee.id}</p>
      <p><strong>Annual CTC:</strong> ₹${salary.total_annual || 0}</p>
      <p><strong>Monthly CTC:</strong> ₹${salary.total_monthly || 0}</p>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: { rejectUnauthorized: false }
    });

    const info = await transporter.sendMail({
      from: `"HR Team" <${process.env.GMAIL_USER}>`,
      to: employee.email,
      subject: 'Salary Certificate',
      html
    });

    console.log('Email sent info:', info);
    res.json({ message: 'Salary certificate sent successfully!' });

  } catch (err) {
    console.error('Error in /salary-certificate route:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//--------------------------------------------------------------

app.post('/api/employees/:id/salary', async (req, res) => {
  const employeeId = req.params.id;
  console.log('[DEBUG] Employee ID:', employeeId);
  console.log('[DEBUG] Request body:', req.body);

  try {
    // Convert all numeric fields from strings to numbers
    const ctc = Number(req.body.ctc || 0);
    const basic_percent = Number(req.body.basic_percent || 0);
    const basic_annual = Number(req.body.basic_annual || 0);
    const basic_monthly = Number(req.body.basic_monthly || 0);
    const hra_percent = Number(req.body.hra_percent || 0);
    const hra_annual = Number(req.body.hra_annual || 0);
    const hra_monthly = Number(req.body.hra_monthly || 0);
    const conveyance = Number(req.body.conveyance || 0);
    const conveyance_annual = Number(req.body.conveyance_annual || 0);
    const fixed_allowance = Number(req.body.fixed_allowance || 0);
    const fixed_allowance_monthly = Number(req.body.fixed_allowance_monthly || 0);
    const total_annual = Number(req.body.total_annual || 0);
    const total_monthly = Number(req.body.total_monthly || 0);

    const [result] = await promisePool.query(
      `INSERT INTO employee_salary 
       (employee_id, ctc, basic_percent, basic_annual, basic_monthly, hra_percent, hra_annual, hra_monthly, conveyance, conveyance_annual, fixed_allowance, fixed_allowance_monthly, total_annual, total_monthly)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, ctc, basic_percent, basic_annual, basic_monthly, hra_percent, hra_annual, hra_monthly, conveyance, conveyance_annual, fixed_allowance, fixed_allowance_monthly, total_annual, total_monthly]
    );

    console.log('[DEBUG] Salary insert result:', result);
    res.json({ message: 'Salary saved successfully', result });
  } catch (err) {
    console.error('[DEBUG] Salary insert error:', err);
    res.status(500).json({ error: 'Failed to save salary' });
  }
});

// Get Salary by Employee ID
app.get('/api/employees/:id/salary', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const [rows] = await promisePool.query(
      'SELECT * FROM employee_salary WHERE employee_id = ?', [employeeId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Salary not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Salary (optional, if employee deleted cascade will remove automatically)
app.delete('/api/employees/:id/salary', async (req, res) => {
  try {
    const employeeId = req.params.id;
    await promisePool.query('DELETE FROM employee_salary WHERE employee_id = ?', [employeeId]);
    res.json({ message: 'Salary deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Salary by Employee ID
app.put('/api/employees/:id/salary', async (req, res) => {
  const employeeId = req.params.id;
  console.log('[DEBUG] Update Salary for Employee ID:', employeeId);
  console.log('[DEBUG] Request body:', req.body);

  try {
    // Convert numeric fields safely
    const ctc = Number(req.body.ctc || 0);
    const basic_percent = Number(req.body.basic_percent || 0);
    const basic_annual = Number(req.body.basic_annual || 0);
    const basic_monthly = Number(req.body.basic_monthly || 0);
    const hra_percent = Number(req.body.hra_percent || 0);
    const hra_annual = Number(req.body.hra_annual || 0);
    const hra_monthly = Number(req.body.hra_monthly || 0);
    const conveyance = Number(req.body.conveyance || 0);
    const conveyance_annual = Number(req.body.conveyance_annual || 0);
    const fixed_allowance = Number(req.body.fixed_allowance || 0);
    const fixed_allowance_monthly = Number(req.body.fixed_allowance_monthly || 0);
    const total_annual = Number(req.body.total_annual || 0);
    const total_monthly = Number(req.body.total_monthly || 0);

    // Update the record
    const [result] = await promisePool.query(
      `UPDATE employee_salary SET 
         ctc = ?, 
         basic_percent = ?, 
         basic_annual = ?, 
         basic_monthly = ?, 
         hra_percent = ?, 
         hra_annual = ?, 
         hra_monthly = ?, 
         conveyance = ?, 
         conveyance_annual = ?, 
         fixed_allowance = ?, 
         fixed_allowance_monthly = ?, 
         total_annual = ?, 
         total_monthly = ?, 
         updated_at = NOW()
       WHERE employee_id = ?`,
      [ctc, basic_percent, basic_annual, basic_monthly, hra_percent, hra_annual, hra_monthly,
        conveyance, conveyance_annual, fixed_allowance, fixed_allowance_monthly, total_annual, total_monthly, employeeId]
    );

    console.log('[DEBUG] Salary update result:', result);
    res.json({ message: 'Salary updated successfully', result });
  } catch (err) {
    console.error('[DEBUG] Salary update error:', err);
    res.status(500).json({ error: 'Failed to update salary' });
  }
});


//----------------------------new--------------------------------
// Add salary
app.post('/api/salary', async (req, res) => {
  console.log('Salary POST received:', req.body);

  const {
    employee_id,
    basic = 0,
    hra = 0,
    da = 0,
    conveyance = 0,
    pf = 0,
    bonus = 0,
    travel = 0,
    total = 0,
    totalMonthly = 0,
    totalAnnual = 0,
    status = 'Active',
    date = new Date(),
    appliedFunds = []
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO salary 
       (employee_id, basic, hra, da, conveyance, pf, bonus, travel, total, totalMonthly, totalAnnual, status, date, appliedFunds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        basic,
        hra,
        da,
        conveyance,
        pf,
        bonus,
        travel,
        total,
        totalMonthly,
        totalAnnual,
        status,
        date,
        JSON.stringify(appliedFunds)
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Error inserting salary:", err);
    res.status(500).json({ success: false, message: "DB insert failed", error: err });
  }
});

// PUT
app.put('/api/salary/:id', async (req, res) => {
  const { id } = req.params;
  const { employee_id, basic, total = 0, status = 'Active', date = new Date(), appliedFunds = [] } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE salary 
       SET employee_id=?, basic=?, total=?, status=?, date=?, appliedFunds=? 
       WHERE id=?`,
      [employee_id, basic, total, status, date, JSON.stringify(appliedFunds), id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Salary not found' });

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error updating salary:', err);
    res.status(500).json({ success: false, message: 'DB update failed', error: err });
  }
});

// Delete salary
app.delete('/api/salary/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Deleting salary with id:', id);
  try {
    const [result] = await db.query('DELETE FROM salary WHERE id = ?', [Number(id)]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Salary not found' });
    }
    res.json({ message: 'Salary deleted successfully' });
  } catch (err) {
    console.error('Error deleting salary:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update salary status only
app.put('/api/salary/:id', (req, res) => {
  const { id } = req.params;
  const { employee_id, basic, total = 0, status = 'Active', date = new Date(), appliedFunds = [] } = req.body;

  const sql = `
    UPDATE salary 
    SET employee_id=?, basic=?, total=?, status=?, date=?, appliedFunds=? 
    WHERE id=?
  `;

  db.query(sql, [employee_id, basic, total, status, date, JSON.stringify(appliedFunds), id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'DB update failed', error: err });
    res.json({ success: true, id });
  });
});

// Get all salary records
app.get('/api/salary', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM salary ORDER BY created_at DESC`);

    // Parse appliedFunds for each row
    const salaries = rows.map(row => {
      if (row.appliedFunds) {
        try {
          row.appliedFunds = JSON.parse(row.appliedFunds);
        } catch {
          row.appliedFunds = [];
        }
      }
      return row;
    });

    res.json(salaries);
  } catch (err) {
    console.error("Error fetching salaries:", err);
    res.status(500).json({ error: "DB fetch failed", details: err });
  }
});

// --------------------- Leaves Routes ---------------------

function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  return diffDays > 0 ? diffDays : 0;
}

function validateLeave(req, res, next) {
  const { employee_id, start_date, end_date, leave_type } = req.body;
  if (!employee_id || !start_date || !end_date || !leave_type) {
    return res.status(400).json({
      error: 'Missing required fields: employee_id, start_date, end_date, leave_type'
    });
  }
  next();
}

// Create Leave
app.post('/api/leaves', validateLeave, async (req, res) => {
  try {
    const { employee_id, start_date, end_date, status, reason, leave_type } = req.body;
    const duration = calculateDuration(start_date, end_date);

    const [result] = await promisePool.query(
      `INSERT INTO leaves (employee_id, start_date, end_date, status, reason, leave_type, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, start_date, end_date, status || 'pending', reason || null, leave_type, duration]
    );

    res.status(201).json({ message: 'Leave created', id: result.insertId });
  } catch (err) {
    console.error('Error creating leave:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get All Leaves
app.get('/api/leaves', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM leaves');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Leaves by Employee ID
app.get('/api/leaves/employee/:employee_id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM leaves WHERE employee_id = ?', [req.params.employee_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Leave
app.put('/api/leaves/:id', async (req, res) => {
  try {
    let { start_date, end_date, status, reason, leave_type } = req.body;

    // If either start_date or end_date missing, fetch current values
    if (!start_date || !end_date) {
      const [rows] = await promisePool.query('SELECT start_date, end_date FROM leaves WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Leave not found' });

      if (!start_date) start_date = rows[0].start_date;
      if (!end_date) end_date = rows[0].end_date;
    }

    const duration = calculateDuration(start_date, end_date);

    await promisePool.query(
      `UPDATE leaves SET start_date = ?, end_date = ?, status = ?, reason = ?, leave_type = ?, duration = ? WHERE id = ?`,
      [start_date, end_date, status || 'pending', reason || null, leave_type, duration, req.params.id]
    );

    res.json({ message: 'Leave updated' });
  } catch (err) {
    console.error('Error updating leave:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete Leave
app.delete('/api/leaves/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM leaves WHERE id = ?', [req.params.id]);
    res.json({ message: 'Leave deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Leave Stats by Employee ID
app.get('/api/leaves/employee/:employee_id/stats', async (req, res) => {
  try {
    const employeeId = req.params.employee_id;

    const [rows] = await promisePool.query(
      `SELECT status, leave_type, duration 
       FROM leaves 
       WHERE employee_id = ?`,
      [employeeId]
    );

    let totalLeaves = 0;
    let leavesTaken = 0;
    let workFromHome = 0;

    rows.forEach(row => {
      totalLeaves += row.duration;

      if (row.status === 'Approved') {
        leavesTaken += row.duration;
      }

      if (row.leave_type.toLowerCase() === 'work from home') {
        workFromHome += row.duration;
      }
    });

    const leavesRemaining = totalLeaves - leavesTaken;

    res.json({
      totalLeaves,
      leavesTaken,
      leavesRemaining: leavesRemaining >= 0 ? leavesRemaining : 0,
      workFromHome
    });
  } catch (err) {
    console.error('Error fetching leave stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --------------------- Department Routes ---------------------

// Create Department
app.post('/api/department', (req, res) => {
  const { name, status = 'active', description = null } = req.body;
  const sql = 'INSERT INTO department (name, status, description) VALUES (?, ?, ?)';
  pool.query(sql, [name, status, description], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Department added', id: result.insertId });
  });
});

// Get All Departments
app.get('/api/department', (req, res) => {
  pool.query('SELECT * FROM department', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get Department by ID
app.get('/api/department/:id', (req, res) => {
  pool.query('SELECT * FROM department WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json(result[0]);
  });
});

// Update Department
app.put('/api/department/:id', (req, res) => {
  const { name, status, description = null } = req.body;
  const sql = 'UPDATE department SET name = ?, status = ?, description = ? WHERE id = ?';
  pool.query(sql, [name, status, description, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Department updated' });
  });
});

// Delete Department
app.delete('/api/department/:id', (req, res) => {
  const sql = 'DELETE FROM department WHERE id = ?';
  pool.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Department deleted' });
  });
});



// -------------------- Attendance Routes --------------------
const attendanceRouter = express.Router();

// ✅ POST Attendance
attendanceRouter.post("/", async (req, res) => {
  try {
    const { empId, empName, department, date, checkIn, checkOut, shift, lateMark } = req.body;

    if (!empId || !empName || !date) {
      return res.status(400).json({
        error:
          "empId, empName, and date are required. Received: " +
          JSON.stringify({ empId, empName, date }),
      });
    }

    const sql = `INSERT INTO attendance 
      (empId, empName, department, date, checkIn, checkOut, shift, lateMark) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await promisePool.query(sql, [
      Number(empId),
      empName,
      department || null,
      new Date(date).toISOString().split("T")[0],
      checkIn || null,
      checkOut || null,
      shift || "Morning",
      lateMark ? 1 : 0,
    ]);

    res.status(201).json({ message: "Attendance marked", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET All Attendance
attendanceRouter.get("/", async (req, res) => {
  try {
    const [rows] = await promisePool.query("SELECT * FROM attendance ORDER BY date DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET Attendance by ID
attendanceRouter.get("/:id", async (req, res) => {
  try {
    const [rows] = await promisePool.query("SELECT * FROM attendance WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Attendance record not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE Attendance
attendanceRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { empId, empName, department, date, checkIn, checkOut, shift, lateMark } = req.body;

    const sql = `UPDATE attendance 
      SET empId=?, empName=?, department=?, date=?, checkIn=?, checkOut=?, shift=?, lateMark=? 
      WHERE id=?`;

    const [result] = await promisePool.query(sql, [
      Number(empId),
      empName,
      department || null,
      new Date(date).toISOString().split("T")[0],
      checkIn || null,
      checkOut || null,
      shift || "Morning",
      lateMark ? 1 : 0,
      id,
    ]);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Attendance record not found" });
    res.json({ message: "Attendance updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE Attendance
attendanceRouter.delete("/:id", async (req, res) => {
  try {
    const [result] = await promisePool.query("DELETE FROM attendance WHERE id=?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Attendance record not found" });
    res.json({ message: "Attendance deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ IMPORT Attendance (CSV/Excel)
attendanceRouter.post("/import", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    let records = [];

    if (req.file.originalname.endsWith(".csv")) {
      const file = fs.readFileSync(filePath, "utf8");
      records = Papa.parse(file, { header: true, skipEmptyLines: true }).data;
    } else if (req.file.originalname.endsWith(".xlsx")) {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      records = xlsx.utils.sheet_to_json(sheet);
    } else {
      return res.status(400).json({ message: "Only CSV or Excel files allowed" });
    }

    for (const rec of records) {
      if (!rec.empId || !rec.empName || !rec.date) continue;
      await promisePool.query(
        `INSERT INTO attendance (empId, empName, department, date, checkIn, checkOut, shift, lateMark) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(rec.empId),
          rec.empName,
          rec.department || null,
          new Date(rec.date).toISOString().split("T")[0],
          rec.checkIn || null,
          rec.checkOut || null,
          rec.shift || "Morning",
          rec.lateMark ? 1 : 0,
        ]
      );
    }

    fs.unlinkSync(filePath);
    res.json({ message: "Attendance imported successfully" });
  } catch (err) {
    res.status(500).json({ message: "Import failed", error: err.message });
  }
});

// ✅ PATCH Update Shift
attendanceRouter.put("/:id/shift", async (req, res) => {
  try {
    const { shift } = req.body;
    const { id } = req.params;
    await promisePool.query("UPDATE attendance SET shift=? WHERE id=?", [shift || "Morning", id]);
    res.json({ message: "Shift updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH Update Late Mark
attendanceRouter.put("/:id/latemark", async (req, res) => {
  try {
    const { lateMark } = req.body;
    const { id } = req.params;
    await promisePool.query("UPDATE attendance SET lateMark=? WHERE id=?", [
      lateMark ? 1 : 0,
      id,
    ]);
    res.json({ message: "Late mark updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Mount router at /api/attendance
app.use("/api/attendance", attendanceRouter);



// --------------------- Global Error Handler ---------------------
app.use((err, req, res, next) => {
  console.error('Global Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});


// --------------------- Teams Routes ---------------------
// Get all teams
// GET /teams
app.get('/teams', async (req, res) => {
  try {
    const [teams] = await pool.promise().query('SELECT * FROM teams');

    // Join team_members with employees
    const [members] = await pool.promise().query(`
      SELECT tm.team_id, e.id, e.firstname, e.lastName, e.email, e.image
      FROM team_members tm
      JOIN employees e ON e.id = tm.employee_id
    `);

    const result = teams.map(team => ({
      ...team,
      members: members.filter(m => m.team_id === team.id)
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

app.get('/api/employees/:id/teams', async (req, res) => {
  const employeeId = req.params.id;
  try {
    const [teams] = await db.query(
      'SELECT t.id, t.name, t.status FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.employee_id = ?',
      [employeeId]
    );
    res.json(teams);
  } catch (err) {
    console.error('GET /api/employees/:id/teams error:', err);
    res.status(500).json({ error: err.message });
  }
});


// Add new team
app.post('/teams', async (req, res) => {
  const { name, status = 'active', memberIds = [] } = req.body;

  if (!name) return res.status(400).json({ error: 'Team name is required' });

  try {
    const [result] = await db.query('INSERT INTO teams (name, status) VALUES (?, ?)', [name, status]);
    const teamId = result.insertId;

    if (memberIds.length > 0) {
      const values = memberIds.map(empId => [teamId, empId]);
      await db.query('INSERT INTO team_members (team_id, employee_id) VALUES ?', [values]);
    }

    res.json({ message: 'Team created', teamId });
  } catch (err) {
    console.error('POST /teams error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update team status
app.put('/teams/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [result] = await db.query('UPDATE teams SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Backend
app.put('/api/employees/:id/team', async (req, res) => {
  const employeeId = req.params.id;
  const { teamName } = req.body;

  if (!teamName) {
    return res.status(400).json({ error: 'teamName is required' });
  }

  try {
    // Check if team exists
    let [teams] = await db.query('SELECT id FROM teams WHERE name = ?', [teamName]);
    let teamId;

    if (teams.length === 0) {
      // Create team
      const [result] = await db.query('INSERT INTO teams (name, status) VALUES (?, ?)', [teamName, 'Active']);
      teamId = result.insertId;
    } else {
      teamId = teams[0].id;
    }

    // Assign employee to team
    await db.query('INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)', [teamId, employeeId]);

    res.json({ success: true, message: 'Employee added to team', teamId });
  } catch (err) {
    console.error('Failed to add employee to team:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /teams/:id
app.put('/teams/:id', async (req, res) => {
  const { id } = req.params;
  const { name, status, members } = req.body; // members = array of employee IDs

  try {
    // Update team info
    await pool.promise().query('UPDATE teams SET name = ?, status = ? WHERE id = ?', [name, status, id]);

    // Delete existing members
    await pool.promise().query('DELETE FROM team_members WHERE team_id = ?', [id]);

    // Insert new members
    if (members && members.length > 0) {
      const values = members.map(empId => [id, empId]);
      await pool.promise().query('INSERT INTO team_members (team_id, employee_id) VALUES ?', [values]);
    }

    res.json({ message: 'Team updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update team' });
  }
});

// Delete team

app.delete('/teams/:id', async (req, res) => {
  const teamId = req.params.id;

  try {
    // Delete team members first
    await db.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);

    // Delete the team
    await db.query('DELETE FROM teams WHERE id = ?', [teamId]);

    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Failed to delete team:', err);
    res.status(500).json({ message: 'Failed to delete team' });
  }
});


// --------------------- Chats Start ---------------------
// CREATE - Add employee
app.post("/api/employees", validateEmployeeFields, (req, res) => {
  let {
    name,
    office,
    email,
    salary,
    role,
    status,
    firstname,
    lastName,
    position,
    team,
    departmentId,
    joiningDate,
    inviteEmail,
    employmentType,
    countryOfEmployment,
    lineManager,
    currency,
  } = req.body;

  name = name || `${firstname} ${lastName}`;
  departmentId = departmentId || 1;

  const sql = `INSERT INTO employees 
    (name, office, email, salary, role, status, firstname, lastName, position, team, departmentId, joiningDate,
     inviteEmail, employmentType, countryOfEmployment, lineManager, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  pool.query(
    sql,
    [
      name,
      office,
      email,
      salary,
      role,
      status,
      firstname,
      lastName,
      position,
      team,
      departmentId,
      joiningDate,
      inviteEmail ?? false,
      employmentType,
      countryOfEmployment,
      lineManager,
      currency
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting employee:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "Employee added", id: result.insertId });
    }
  );
});

// GET all messages with user info
// GET all messages with user info (no isRead column)
app.get("/api/chat/messages/all", async (req, res) => {
  try {
    const [messages] = await promisePool.query(
      `SELECT 
        m.id, 
        m.from, 
        m.to, 
        m.content, 
        m.timestamp,
        e1.firstname AS from_firstname, 
        e1.lastName AS from_lastname,
        e2.firstname AS to_firstname, 
        e2.lastName AS to_lastname
      FROM messages m
      JOIN employees e1 ON m.from = e1.id
      JOIN employees e2 ON m.to = e2.id
      ORDER BY m.timestamp DESC`
    );

    res.json(messages);
  } catch (err) {
    console.error("Error fetching all messages:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chat/messages", async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res
      .status(400)
      .json({ error: "Missing 'from' or 'to' query parameters" });
  }

  try {
    const [messages] = await promisePool.query(
      `SELECT 
        m.id,
        m.from,
        m.to,
        m.content,
        m.timestamp,
        e1.firstname AS from_firstname,
        e1.lastName AS from_lastname,
        e2.firstname AS to_firstname,
        e2.lastName AS to_lastname
      FROM messages m
      JOIN employees e1 ON m.from = e1.id
      JOIN employees e2 ON m.to = e2.id
      WHERE (m.from = ? AND m.to = ?) OR (m.from = ? AND m.to = ?)
      ORDER BY m.timestamp ASC`,
      [from, to, to, from]
    );

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Send a new message
app.post("/api/chat/messages", async (req, res) => {
  const { from, to, content } = req.body;

  // Basic validation
  if (!from || !to || !content) {
    return res
      .status(400)
      .json({ error: "Missing 'from', 'to', or 'content' in request body" });
  }

  try {
    // 1. Insert message into messages table
    const [result] = await promisePool.query(
      `INSERT INTO messages (\`from\`, \`to\`, content, timestamp, read_status) 
       VALUES (?, ?, ?, NOW(), 0)`, // 0 = sent
      [from, to, content]
    );

    const now = new Date();

    // 2. Update lastMessage & lastMessageTime for BOTH sender and receiver
    await promisePool.query(
      `UPDATE employees 
       SET lastMessage = ?, lastMessageTime = ? 
       WHERE id IN (?, ?)`,
      [content, now, from, to]
    );

    // 3. Send response back
    res.json({
      success: true,
      message: "Message sent successfully",
      messageId: result.insertId,
      data: {
        id: result.insertId,
        from,
        to,
        content,
        timestamp: now,
        read_status: 0,
      },
    });
  } catch (err) {
    console.error("Error inserting message:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// app.put("/api/chat/messages/:id/seen", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const [result] = await promisePool.query(
//       `UPDATE messages
//        SET read_status = 2  -- 2 = seen
//        WHERE id = ?`,
//       [id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Message not found" });
//     }

//     res.json({ success: true, message: "Message marked as seen" });
//   } catch (err) {
//     console.error("Error updating message status:", err.message);
//     res.status(500).json({ error: err.message });
//   }
// });

// Delete entire conversation between 2 users
app.put("/api/chat/messages/:id/seen", async (req, res) => {
  try {
    const [result] = await promisePool.query(
      "UPDATE messages SET read_status = 2 WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Message not found" });
    res.json({ success: true, message: "Message marked as seen" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/chat/conversation/:userId/:employeeId", async (req, res) => {
  const { userId, employeeId } = req.params;

  try {
    const [result] = await promisePool.query(
      `DELETE FROM messages
       WHERE (\`from\` = ? AND \`to\` = ?)
          OR (\`from\` = ? AND \`to\` = ?)`,
      [userId, employeeId, employeeId, userId]
    );

    res.json({
      success: true,
      message: "Conversation deleted successfully",
      deletedCount: result.affectedRows,
    });
  } catch (err) {
    console.error("Error deleting conversation:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Delete single message by ID
app.delete("/api/chat/messages/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await promisePool.query(
      "DELETE FROM messages WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Block employee
app.put("/api/employees/:id/block", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await promisePool.query(
      `UPDATE employees SET isBlocked = 1 WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "User blocked successfully" });
  } catch (err) {
    console.error("Error blocking user:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Clear messages with a user
app.delete("/api/chat/messages/:id", async (req, res) => {
  const messageId = req.params.id;

  try {
    const [result] = await db.query("DELETE FROM messages WHERE id = ?", [messageId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete chat (same as clear for now, can archive instead)
app.delete("/api/chat/delete/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await promisePool.query(
      `DELETE FROM messages WHERE from_user = ? OR to_user = ?`,
      [userId, userId]
    );
    res.json({ success: true, message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Block / Unblock user
app.put("/api/employees/:id/block", async (req, res) => {
  await promisePool.query(`UPDATE employees SET isBlocked = 1 WHERE id = ?`, [
    req.params.id,
  ]);
  res.json({ success: true, message: "User blocked" });
});

app.put("/api/employees/:id/unblock", async (req, res) => {
  await promisePool.query(`UPDATE employees SET isBlocked = 0 WHERE id = ?`, [
    req.params.id,
  ]);
  res.json({ success: true, message: "User unblocked" });
});

// ✅ Delete message by ID
// Async function required for await
app.delete("/api/chat/messages/:id", async (req, res) => {
  const messageId = req.params.id;

  try {
    // Using promise pool correctly
    const [result] = await db.query("DELETE FROM messages WHERE id = ?", [messageId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Database error" });
  }
});
//-------------------------- Chats End ---------------------// 

//-----------------------Notes Routes ---------------------

// ✅ Get active notes
app.get("/api/notes", (req, res) => {
  pool.query(
    "SELECT * FROM notes WHERE is_deleted = 0 ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ✅ Add note
app.post("/api/notes", (req, res) => {
  const { title, assignee, tag, priority, due_date, status, description } = req.body;
  const sql = `INSERT INTO notes (title, assignee, tag, priority, due_date, status, description, is_deleted) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)`;
  pool.query(
    sql,
    [title, assignee, tag, priority, due_date, status, description],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Note added successfully", id: result.insertId });
    }
  );
});

// ✅ Move note to trash
app.put("/api/notes/:id/trash", (req, res) => {
  const sql = "UPDATE notes SET is_deleted = 1 WHERE id = ?";
  pool.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Note moved to trash successfully" });
  });
});

// ✅ Get trash notes
app.get("/api/notes/trash", (req, res) => {
  pool.query(
    "SELECT * FROM notes WHERE is_deleted = 1 ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ✅ Permanent delete
app.delete("/api/notes/:id", (req, res) => {
  pool.query("DELETE FROM notes WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Note permanently deleted" });
  });
});

//------------------------Leave Types-------------------------

// Get all leave types
app.get('/api/leave-types', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM leave_types');
    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching leave types:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// Add leave type
app.post('/api/leave-types', async (req, res) => {
  const { name, status } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO leave_types (name, status) VALUES (?, ?)',
      [name, status]
    );
    console.log("✅ Leave type inserted:", result.insertId);
    res.json({ success: true, id: result.insertId, message: "Leave type added successfully" });
  } catch (err) {
    console.error("❌ Error inserting leave type:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// Update leave type
app.put('/api/leave-types/:id', async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  try {
    await db.query(
      'UPDATE leave_types SET name=?, status=? WHERE id=?',
      [name, status, id]
    );
    res.json({ success: true, message: "Leave type updated successfully" });
  } catch (err) {
    console.error("❌ Error updating leave type:", err);
    res.status(500).json({ error: "Database update failed" });
  }
});

// Delete leave type
app.delete('/api/leave-types/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM leave_types WHERE id=?', [req.params.id]);
    res.json({ success: true, message: "Leave type deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting leave type:", err);
    res.status(500).json({ error: "Database delete failed" });
  }
});


// Get all leave types
app.get('/api/leave-types', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM leave_types');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching leave types:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add new leave type
app.post('/api/leave-types', (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ message: 'Leave type name is required' });

  const query = 'INSERT INTO leave_types (name, status) VALUES (?, ?)';
  db.query(query, [name, status || 'Active'], (err, result) => {
    if (err) return res.status(500).json(err);
    // Return the inserted row
    db.query('SELECT * FROM leave_types WHERE id = ?', [result.insertId], (err2, rows) => {
      if (err2) return res.status(500).json(err2);
      res.json(rows[0]);
    });
  });
});

// Update leave type
app.put('/api/leave-types/:id', (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  const query = 'UPDATE leave_types SET name = ?, status = ? WHERE id = ?';
  db.query(query, [name, status || 'Active', id], (err) => {
    if (err) return res.status(500).json(err);
    db.query('SELECT * FROM leave_types WHERE id = ?', [id], (err2, rows) => {
      if (err2) return res.status(500).json(err2);
      res.json(rows[0]);
    });
  });
});

// Delete leave type
app.delete('/api/leave-types/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM leave_types WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Leave type deleted successfully' });
  });
});


//-------------------manage-------------------------------


// Get all roles with members
app.get("/api/roles", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.id, r.roleName,
             u.id AS member_id, u.name AS member_name, u.avatarUrl
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
    `);

    const rolesMap = {};
    rows.forEach(row => {
      if (!rolesMap[row.id]) {
        rolesMap[row.id] = { id: row.id, roleName: row.roleName, members: [] };
      }
      if (row.member_id) {
        rolesMap[row.id].members.push({
          id: row.member_id,
          name: row.member_name,
          avatarUrl: row.avatarUrl
        });
      }
    });

    res.json(Object.values(rolesMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Add role
app.post("/api/roles", async (req, res) => {
  const { roleName } = req.body;
  if (!roleName) return res.status(400).json({ error: "roleName is required" });

  try {
    const [result] = await db.query("INSERT INTO roles (roleName) VALUES (?)", [roleName]);
    res.json({ id: result.insertId, roleName, members: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Update role
app.put("/api/roles/:id", async (req, res) => {
  const { id } = req.params;
  const { roleName } = req.body;

  try {
    const [result] = await db.query("UPDATE roles SET roleName = ? WHERE id = ?", [roleName, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Role not found" });
    res.json({ message: "Role updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete role
app.delete("/api/roles/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query("DELETE FROM roles WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Role not found" });
    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/upload", upload.single("avatar"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // Return file URL (so you can save in DB later)
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});
// ----------------------
// USERS API
// ----------------------

app.get('/api/users', async (req, res) => {
  try {
    // Use promise() wrapper for async/await
    const [rows] = await pool.promise().query(`
      SELECT u.id, u.name, u.email, u.avatarUrl, u.role_id, u.employee_id, r.roleName
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY r.roleName, u.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT u.id, u.name, u.email, u.status, u.avatarUrl, u.role_id, u.employee_id, r.roleName FROM users u LEFT JOIN roles r ON u.role_id=r.id WHERE u.id=?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', upload.single('avatar'), async (req, res) => {
  try {
    // ✅ Correct logging of body and file
    console.log('Body:', req.body); // should show: { name: 'John Doe', email: 'john@example.com', ... }
    console.log('File:', req.file); // should show: { fieldname: 'avatar', originalname: 'avatar.jpg', ... }

    const { name, email, password, role_id, employee_id } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    let avatarUrl = null;
    if (req.file) avatarUrl = `http://localhost:3000/uploads/${req.file.filename}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const roleId = role_id ? parseInt(role_id) : null;
    const employeeId = employee_id ? parseInt(employee_id) : null;

    // ✅ Use promise wrapper for async/await
    const [result] = await pool.promise().query(
      `INSERT INTO users (name,email,password,avatarUrl,role_id,employee_id) VALUES (?,?,?,?,?,?)`,
      [name, email, hashedPassword, avatarUrl, roleId, employeeId]
    );

    res.json({ success: true, message: 'User added', userId: result.insertId });
  } catch (err) {
    console.error('Add user error:', err);
    res.status(500).json({ success: false, message: 'Failed to add user', error: err.message });
  }
});

app.put('/api/users/:id', upload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role_id, status, employee_id } = req.body;
  const avatarUrl = req.file ? req.file.filename : req.body.avatarUrl || null;

  try {
    let query, params;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET name=?,email=?,password=?,role_id=?,status=?,avatarUrl=?,employee_id=? WHERE id=?';
      params = [name, email, hashed, role_id, status, avatarUrl, employee_id, id];
    } else {
      query = 'UPDATE users SET name=?,email=?,role_id=?,status=?,avatarUrl=?,employee_id=? WHERE id=?';
      params = [name, email, role_id, status, avatarUrl, employee_id, id];
    }
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ---------------- Remove role from selected users ----------------
app.post('/api/users/remove-role', async (req, res) => {
  try {
    const { ids } = req.body; // expecting { ids: [1,2,3] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No user IDs provided' });
    }

    // Create placeholders (?, ?, ?)
    const placeholders = ids.map(() => '?').join(',');
    const query = `UPDATE users SET role_id = NULL WHERE id IN (${placeholders})`;

    const [result] = await pool.promise().query(query, ids);

    res.json({
      success: true,
      message: `Role removed for ${result.affectedRows} users`,
      removedCount: result.affectedRows
    });
  } catch (err) {
    console.error('Remove role error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});


// Node/Express example
app.get('/api/managers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name
      FROM users
      WHERE role_id = 3   -- role_id 3 = Line Manager
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//-------------------------------- calender--------------------

// GET all events
app.get('/api/calendar', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM calendar ORDER BY start_date ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST new event
app.post('/api/calendar', async (req, res) => {
  try {
    const { title, category, start_date, end_date, color } = req.body;
    if (!title || !category || !start_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.query(
      'INSERT INTO calendar (title, category, start_date, end_date, color) VALUES (?, ?, ?, ?, ?)',
      [title, category, start_date, end_date || start_date, color]
    );

    res.json({
      id: result.insertId,
      title,
      category,
      start_date,
      end_date: end_date || start_date,
      color
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE event
app.delete('/api/calendar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM calendar WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

//------------------------Funds-------------------------

// Get all Active funds
app.get('/api/funds', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM funds WHERE status="Active"');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// Add fund
app.post('/api/funds', async (req, res) => {
  const { name, percentage, fixed_amount, type, status, isDeduction } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO funds (name, percentage, fixed_amount, type, status, is_deduction) VALUES (?, ?, ?, ?, ?, ?)',
      [name, percentage, fixed_amount, type, status, isDeduction ? 1 : 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// Update fund
// Update fund
app.put('/api/funds/:id', async (req, res) => {
  const id = req.params.id;
  const { name, percentage, fixed_amount, type, status, isDeduction } = req.body;
  console.log('Update request received for ID:', id);
  console.log('Payload:', req.body);

  try {
    const [result] = await db.query(
      'UPDATE funds SET name=?, percentage=?, fixed_amount=?, type=?, status=?, is_deduction=? WHERE id=?',
      [name, percentage, fixed_amount, type, status, isDeduction ? 1 : 0, id]
    );
    console.log('Updated rows:', result.affectedRows);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating fund:', err);
    res.status(500).json({ error: err });
  }
});

// Delete fund
app.delete('/api/funds/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid fund id' });
  }

  console.log('DELETE request received for id:', id);

  try {
    const [result] = await db.query('DELETE FROM funds WHERE id = ?', [id]);
    console.log('Deleted rows:', result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting fund:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//------------------------------------------------------

// --------------------- Employee Documents Routes ---------------------
// Serve uploads folder
app.use('/uploads', express.static('uploads'));

// --------------------- Employee Documents Routes ---------------------

// Get all documents for all employees
app.get('/employees/documents', async (req, res) => {
  try {
    const [docs] = await promisePool.query('SELECT * FROM employee_details');
    const docsWithPath = docs.map(doc => {
      const fileName = doc.filePath.split(/[/\\]/).pop();
      return { ...doc, filePath: `/uploads/${fileName}` };
    });
    res.json(docsWithPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get documents for a specific employee
app.get('/api/employees/:id/documents', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const [docs] = await promisePool.query(
      'SELECT * FROM employee_details WHERE employeeId = ?',
      [employeeId]
    );
    const docsWithPath = docs.map(doc => {
      const fileName = doc.filePath.split(/[/\\]/).pop();
      return { ...doc, filePath: `/uploads/${fileName}` };
    });
    res.json(docsWithPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employee documents' });
  }
});

// Upload document for a specific employee
app.post('/api/employees/:employeeId/documents', upload.single('file'), async (req, res) => {
  try {
    const { name, date } = req.body;
    const type = req.file.mimetype;
    const size = req.file.size.toString();
    const filePath = '/uploads/' + req.file.filename;

    const [result] = await promisePool.query(
      'INSERT INTO employee_details (employeeId, name, type, date, size, filePath) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.employeeId, name, type, date || new Date(), size, filePath]
    );

    res.json({
      id: result.insertId,
      employeeId: req.params.employeeId,
      name,
      type,
      date: date || new Date(),
      size,
      filePath
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Update document
app.put('/api/employees/documents/:id', upload.single('file'), async (req, res) => {
  try {
    const { name, date } = req.body;
    const params = [name, date];
    let sql = 'UPDATE employee_details SET name=?, date=?';

    if (req.file) {
      sql += ', filePath=?';
      params.push('/uploads/' + req.file.filename);
    }

    sql += ' WHERE id=?';
    params.push(req.params.id);

    await promisePool.query(sql, params);

    res.json({
      id: req.params.id,
      name,
      date,
      filePath: req.file ? '/uploads/' + req.file.filename : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
app.delete('/api/employees/documents/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM employee_details WHERE id=?', [req.params.id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});


// Get employee details with salary
app.get('/api/employees/:id/details', async (req, res) => {
  const empId = req.params.id;

  try {
    // employee basic info
    const [employee] = await promisePool.query(
      `SELECT * FROM employees WHERE id = ?`, [empId]
    );

    if (!employee.length) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // employee salary info
    const [salary] = await promisePool.query(
      `SELECT * FROM employee_salary WHERE employeeId = ?`, [empId]
    );

    res.json({
      ...employee[0],
      salary: salary.length ? salary[0] : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching employee details" });
  }
});
// --------------------- Company Routes ---------------------
const companyRouter = express.Router();

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GET Company Details
companyRouter.get('/', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM company LIMIT 1');
    if (rows.length === 0) return res.status(404).json({ message: 'No company info found' });

    let company = rows[0];
    if (company.logo) {
      company.logo = `${req.protocol}://${req.get('host')}/uploads/${company.logo}`;
    }

    res.json(company);
  } catch (err) {
    console.error('Fetch company error:', err.message);
    res.status(500).json({ message: 'Failed to fetch company details' });
  }
});
// CREATE or UPDATE Company
companyRouter.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { name, address, email, phone, website } = req.body;
    if (!name || !address) return res.status(400).json({ message: 'Name and address are required' });

    const [existing] = await promisePool.query('SELECT id, logo FROM company LIMIT 1');
    let logoPath = existing.length && existing[0].logo ? existing[0].logo : null;
    if (req.file) logoPath = req.file.filename;

    if (existing.length > 0) {
      // UPDATE
      await promisePool.query(
        'UPDATE company SET name=?, address=?, email=?, phone=?, website=?, logo=? WHERE id=?',
        [name, address, email || '', phone || '', website || '', logoPath, existing[0].id]
      );
      res.json({ message: 'Company details updated successfully' });
    } else {
      // INSERT
      await promisePool.query(
        'INSERT INTO company (name, address, email, phone, website, logo) VALUES (?, ?, ?, ?, ?, ?)',
        [name, address, email || '', phone || '', website || '', logoPath]
      );
      res.json({ message: 'Company details saved successfully' });
    }
  } catch (err) {
    console.error('Save company error:', err.message);
    res.status(500).json({ message: 'Failed to save company details' });
  }
});

// Mount router
app.use('/api/company', companyRouter);

module.exports = companyRouter;

//--------------------- API Routes End --------------------
// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
