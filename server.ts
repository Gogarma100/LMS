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
  type: "sqlite",
  database: "database.sqlite",
  synchronize: true,
  logging: false,
  entities: [User, Course, CourseProgress],
});

const JWT_SECRET = process.env.JWT_SECRET || "kokostream-secret";

async function startServer() {
  await AppDataSource.initialize();
  console.log("Data Source has been initialized!");

  // Seed data if empty
  const courseRepo = AppDataSource.getRepository(Course);
  const userRepo = AppDataSource.getRepository(User);

  // Seed courses
  const courseCount = await courseRepo.count();
  if (courseCount === 0) {
    await courseRepo.save([
      { title: "Introduction to Web Development", description: "Learn the basics of HTML, CSS, and JS." },
      { title: "Advanced React Patterns", description: "Master hooks, context, and performance." },
      { title: "Node.js Backend Mastery", description: "Build scalable APIs with Express and TypeORM." },
    ]);
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

  const app = express();
  app.use(cors());
  app.use(express.json());

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
    const courses = await courseRepo.find();
    res.json(courses);
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
    const { title, description } = req.body;
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOneBy({ id: parseInt(req.params.id) });
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.title = title || course.title;
    course.description = description || course.description;
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
}

startServer().catch((err) => console.error(err));
