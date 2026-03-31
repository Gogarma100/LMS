import "reflect-metadata";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { DataSource } from "typeorm";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Entities ---
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, ManyToOne } from "typeorm";

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  password!: string;

  @Column({ type: "varchar", default: "user" })
  role!: string;

  @ManyToMany(() => Course, (course) => course.users)
  courses!: Course[];

  @OneToMany(() => CourseProgress, (progress) => progress.user)
  progress!: CourseProgress[];
}

@Entity()
class Course {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @ManyToMany(() => User, (user) => user.courses)
  @JoinTable()
  users!: User[];

  @OneToMany(() => CourseProgress, (progress) => progress.course)
  progress!: CourseProgress[];

  @OneToMany(() => Module, (module) => module.course, { cascade: true })
  modules!: Module[];
}

@Entity()
class Module {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "text", nullable: true })
  content!: string;

  @Column({ type: "integer", default: 0 })
  order!: number;

  @ManyToOne(() => Course, (course) => course.modules)
  course!: Course;
}

@Entity()
class CourseProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "integer", default: 0 })
  percentageComplete!: number;

  @Column({ type: "text", default: "[]" }) // JSON string of completed module IDs
  completedModules!: string;

  @ManyToOne(() => User, (user) => user.progress)
  user!: User;

  @ManyToOne(() => Course, (course) => course.progress)
  course!: Course;
}

// --- Database Setup ---
const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: false,
  entities: [User, Course, CourseProgress, Module],
  ssl: process.env.DATABASE_URL?.includes("supabase.co") ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET || "kokostream-secret";

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint for Cloud Run
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      db: AppDataSource.isInitialized,
      timestamp: new Date().toISOString()
    });
  });

  // Middleware to check DB readiness for API routes
  app.use((req, res, next) => {
    if (!AppDataSource.isInitialized && req.path.startsWith('/api') && req.path !== '/api/health') {
      return res.status(503).json({ 
        message: "Database is initializing. Please try again in a few seconds.",
        retryAfter: 5
      });
    }
    next();
  });

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: "Admin access required" });
    }
  };

  // --- API Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    const userRepo = AppDataSource.getRepository(User);
    
    const existing = await userRepo.findOneBy({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepo.create({ email, password: hashedPassword, role: "user" });
    await userRepo.save(user);

    res.status(201).json({ message: "User registered successfully" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ accessToken, role: user.role });
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res: any) => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: req.user.id });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const { password, ...userSnapshot } = user;
    res.json(userSnapshot);
  });

  app.put("/api/auth/me", authenticateToken, async (req: any, res: any) => {
    const { email, role } = req.body;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: req.user.id });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email) user.email = email;
    // Only allow role update if the user is an admin OR if we want to allow users to change their own role (usually not recommended, but requested)
    // For this demo, let's allow it as requested "edit their information (email, role, etc.)"
    if (role) user.role = role;

    await userRepo.save(user);
    const { password: _, ...updatedUser } = user;
    res.json(updatedUser);
  });

  app.get("/api/courses", authenticateToken, async (req, res) => {
    const courseRepo = AppDataSource.getRepository(Course);
    const courses = await courseRepo.find({ relations: ["modules"] });
    res.json(courses);
  });

  app.get("/api/courses/:id", authenticateToken, async (req, res) => {
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: parseInt(req.params.id) },
      relations: ["modules"]
    });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  });

  // Admin Course Management
  app.post("/api/courses", authenticateToken, isAdmin, async (req, res) => {
    const { title, description } = req.body;
    const courseRepo = AppDataSource.getRepository(Course);
    const course = courseRepo.create({ title, description });
    await courseRepo.save(course);
    res.status(201).json(course);
  });

  app.put("/api/courses/:id", authenticateToken, isAdmin, async (req, res) => {
    const { title, description, modules } = req.body;
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: parseInt(req.params.id) },
      relations: ["modules"]
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.title = title || course.title;
    course.description = description || course.description;
    
    if (modules) {
      course.modules = modules.map((m: any) => ({
        ...m,
        id: m.id || undefined, // Ensure new modules don't have an ID
        course: course
      }));
    }

    await courseRepo.save(course);
    res.json(course);
  });

  app.delete("/api/courses/:id", authenticateToken, isAdmin, async (req, res) => {
    const courseRepo = AppDataSource.getRepository(Course);
    const result = await courseRepo.delete(req.params.id);
    if (result.affected === 0) return res.status(404).json({ message: "Course not found" });
    res.sendStatus(204);
  });

  // --- Enrollment Endpoints ---
  app.post("/api/courses/:id/enroll", authenticateToken, async (req: any, res: any) => {
    const courseRepo = AppDataSource.getRepository(Course);
    const userRepo = AppDataSource.getRepository(User);

    const course = await courseRepo.findOne({ 
      where: { id: parseInt(req.params.id) },
      relations: ["users"]
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const user = await userRepo.findOneBy({ id: req.user.id });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if already enrolled
    if (course.users.some(u => u.id === user.id)) {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }

    course.users.push(user);
    await courseRepo.save(course);

    res.json({ message: "Enrolled successfully" });
  });

  app.delete("/api/courses/:id/unenroll", authenticateToken, async (req: any, res: any) => {
    const courseRepo = AppDataSource.getRepository(Course);
    const userRepo = AppDataSource.getRepository(User);

    const course = await courseRepo.findOne({ 
      where: { id: parseInt(req.params.id) },
      relations: ["users"]
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.users = course.users.filter(u => u.id !== req.user.id);
    await courseRepo.save(course);

    res.json({ message: "Unenrolled successfully" });
  });

  app.get("/api/courses/:id/users", authenticateToken, isAdmin, async (req, res) => {
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ 
      where: { id: parseInt(req.params.id) },
      relations: ["users"]
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Return users without passwords
    const users = course.users.map(({ password, ...u }) => u);
    res.json(users);
  });

  app.get("/api/auth/me/courses", authenticateToken, async (req: any, res: any) => {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.user.id },
      relations: ["courses"]
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.courses);
  });

  // --- Progress Tracking Endpoints ---
  app.get("/api/courses/:id/progress", authenticateToken, async (req: any, res: any) => {
    const progressRepo = AppDataSource.getRepository(CourseProgress);
    const progress = await progressRepo.findOne({
      where: { 
        user: { id: req.user.id },
        course: { id: parseInt(req.params.id) }
      }
    });

    if (!progress) {
      return res.json({ percentageComplete: 0, completedModules: [] });
    }

    res.json({
      ...progress,
      completedModules: JSON.parse(progress.completedModules)
    });
  });

  app.post("/api/courses/:id/progress", authenticateToken, async (req: any, res: any) => {
    const { percentageComplete, completedModules } = req.body;
    const progressRepo = AppDataSource.getRepository(CourseProgress);
    const userRepo = AppDataSource.getRepository(User);
    const courseRepo = AppDataSource.getRepository(Course);

    let progress = await progressRepo.findOne({
      where: { 
        user: { id: req.user.id },
        course: { id: parseInt(req.params.id) }
      }
    });

    if (!progress) {
      const user = await userRepo.findOneBy({ id: req.user.id });
      const course = await courseRepo.findOneBy({ id: parseInt(req.params.id) });
      if (!user || !course) return res.status(404).json({ message: "User or Course not found" });

      progress = progressRepo.create({
        user,
        course,
        percentageComplete: percentageComplete || 0,
        completedModules: JSON.stringify(completedModules || [])
      });
    } else {
      if (percentageComplete !== undefined) progress.percentageComplete = percentageComplete;
      if (completedModules !== undefined) progress.completedModules = JSON.stringify(completedModules);
    }

    await progressRepo.save(progress);
    res.json({
      ...progress,
      completedModules: JSON.parse(progress.completedModules)
    });
  });

  app.post("/api/courses/:id/progress/toggle-module", authenticateToken, async (req: any, res: any) => {
    const { moduleId } = req.body;
    const progressRepo = AppDataSource.getRepository(CourseProgress);
    const userRepo = AppDataSource.getRepository(User);
    const courseRepo = AppDataSource.getRepository(Course);
    const moduleRepo = AppDataSource.getRepository(Module);

    const courseId = parseInt(req.params.id);
    const course = await courseRepo.findOne({ where: { id: courseId }, relations: ["modules"] });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const module = await moduleRepo.findOneBy({ id: moduleId, course: { id: courseId } });
    if (!module) return res.status(404).json({ message: "Module not found in this course" });

    let progress = await progressRepo.findOne({
      where: { 
        user: { id: req.user.id },
        course: { id: courseId }
      }
    });

    if (!progress) {
      const user = await userRepo.findOneBy({ id: req.user.id });
      if (!user) return res.status(404).json({ message: "User not found" });

      progress = progressRepo.create({
        user,
        course,
        percentageComplete: 0,
        completedModules: JSON.stringify([moduleId])
      });
    } else {
      let completed = JSON.parse(progress.completedModules);
      if (completed.includes(moduleId)) {
        completed = completed.filter((id: number) => id !== moduleId);
      } else {
        completed.push(moduleId);
      }
      progress.completedModules = JSON.stringify(completed);
      
      // Update percentage automatically
      if (course.modules.length > 0) {
        progress.percentageComplete = Math.round((completed.length / course.modules.length) * 100);
      }
    }

    await progressRepo.save(progress);
    res.json({
      ...progress,
      completedModules: JSON.parse(progress.completedModules)
    });
  });

  app.get("/api/courses/progress", authenticateToken, async (req: any, res: any) => {
    const progressRepo = AppDataSource.getRepository(CourseProgress);
    const progressList = await progressRepo.find({
      where: { user: { id: req.user.id } },
      relations: ["course"]
    });

    res.json(progressList.map(p => ({
      ...p,
      completedModules: JSON.parse(p.completedModules)
    })));
  });

  // --- Serve Web App ---
  const webPath = path.join(__dirname, "web");
  app.use(express.static(webPath));

  // Fallback for SPA-like behavior in vanilla JS
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ message: "Not found" });
    res.sendFile(path.join(webPath, "index.html"));
  });

  const PORT = 3000; // Must be 3000 for AI Studio
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kokostream Backend running on http://0.0.0.0:${PORT}`);
  });

  // Initialize DB in the background to prevent startup timeout
  try {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL is not set. Database features will not work.");
    } else {
      console.log("Initializing Data Source...");
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");

      // Seed data if empty
      const courseRepo = AppDataSource.getRepository(Course);
      const userRepo = AppDataSource.getRepository(User);

      // Seed courses and modules
      const courseCount = await courseRepo.count();
      if (courseCount === 0) {
        const courses = [
          { 
            title: "Introduction to Web Development", 
            description: "Learn the basics of HTML, CSS, and JS.",
            modules: [
              { title: "HTML Basics", content: "Learn about tags, elements, and attributes.", order: 1 },
              { title: "CSS Styling", content: "Learn about selectors, colors, and layout.", order: 2 },
              { title: "JavaScript Fundamentals", content: "Learn about variables, functions, and loops.", order: 3 },
            ]
          },
          { 
            title: "Advanced React Patterns", 
            description: "Master hooks, context, and performance.",
            modules: [
              { title: "Custom Hooks", content: "Learn how to build reusable logic.", order: 1 },
              { title: "Context API", content: "Manage global state without prop drilling.", order: 2 },
              { title: "Performance Optimization", content: "Use useMemo and useCallback effectively.", order: 3 },
            ]
          },
          { 
            title: "Node.js Backend Mastery", 
            description: "Build scalable APIs with Express and TypeORM.",
            modules: [
              { title: "Express Middleware", content: "Understand how to process requests.", order: 1 },
              { title: "Database Integration", content: "Connect to SQL databases with TypeORM.", order: 2 },
              { title: "Authentication & Security", content: "Secure your API with JWT and bcrypt.", order: 3 },
            ]
          },
        ];

        for (const c of courses) {
          const course = courseRepo.create(c);
          await courseRepo.save(course);
        }
        console.log("Courses seeded.");
      }

      // Seed Admin User
      const adminEmail = "admin@kokostream.com";
      const adminExists = await userRepo.findOneBy({ email: adminEmail });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await userRepo.save({
          email: adminEmail,
          password: hashedPassword,
          role: "admin"
        });
        console.log("Admin user seeded: admin@kokostream.com / admin123");
      }
    }
  } catch (err) {
    console.error("Error during Data Source initialization:", err);
    console.warn("Server is running but database features are unavailable.");
  }
}

startServer().catch((err) => console.error(err));
