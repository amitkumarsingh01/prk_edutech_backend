// index.js - Complete Node.js backend for user management system
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { body, validationResult } = require('express-validator');  
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

let sources = [];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: '543690557046-m8ns16dkjd2lekkrt0gs2kcpo3s3ft8c.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: 'https://server.prkedutech.com/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // User exists, return user
      return done(null, user);
    } else {
      // Generate random password (10 characters)
      const randomPassword = Math.random().toString(36).slice(-10);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      // Create new user
      const newUser = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: hashedPassword,
        phone: '1234567890', // Required field, but we don't have it from Google
        userType: 'free' // Default user type
      });
      
      await newUser.save();
      return done(null, newUser);
    }
  } catch (error) {
    return done(error, null);
  }
}
));

passport.use(new FacebookStrategy({
  clientID: '560417249889113',
  clientSecret: '2d1dae13ca770e9cacee7ebafb19562b',
  callbackURL: 'https://server.prkedutech.com/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'email']
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if email is available
    if (!profile.emails || !profile.emails[0].value) {
      return done(new Error('Email not provided by Facebook'), null);
    }
    
    // Check if user exists
    let user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // User exists, return user
      return done(null, user);
    } else {
      // Generate random password (10 characters)
      const randomPassword = Math.random().toString(36).slice(-10);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      // Create new user
      const newUser = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: hashedPassword,
        phone: '', // Required field, but we don't have it from Facebook
        userType: 'free' // Default user type
      });
      
      await newUser.save();
      return done(null, newUser);
    }
  } catch (error) {
    return done(error, null);
  }
}
));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const notesDir = path.join(uploadsDir, 'notes');
const notesThumbnailDir = path.join(notesDir, 'thumbnails');
const notesPdfDir = path.join(notesDir, 'pdf');

[notesDir, notesThumbnailDir, notesPdfDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});



app.use('/uploads', express.static(uploadsDir));

mongoose.connect('mongodb://127.0.0.1:27017/prk_edutech_new_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout
})
.then(async () => {
  console.log('Connected to Local MongoDB');

  // Check if any collections exist; if not, create a dummy one
  const collections = await mongoose.connection.db.listCollections().toArray();
  if (collections.length === 0) {
    console.log('Database is empty. Creating a default collection...');
    const SampleModel = mongoose.model('SampleCollection', new mongoose.Schema({ name: String }));
    await SampleModel.create({ name: 'Initial Entry' });
    console.log('Default collection created with an entry.');
  }
})
.catch(err => console.error('MongoDB connection error:', err));



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let finalDir;
    if (file.fieldname === 'thumbnail') {
      finalDir = notesThumbnailDir;
    } else if (file.fieldname === 'pdf') {
      finalDir = notesPdfDir;
    } else {
      finalDir = notesDir;
    }
    cb(null, finalDir);
  },
  filename: function (req, file, cb) {
    // Generate unique ID for the note
    const noteId = uuidv4();
    
    // Determine file extension
    const ext = path.extname(file.originalname);
    
    // Create filename based on note ID and original extension
    cb(null, `${noteId}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Multifile upload configuration
const multiUpload = upload.fields([
  { name: 'thumbnail', maxCount: 1 }, 
  { name: 'pdf', maxCount: 1 }
]);

// Mongoose Schema Definitions

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['free', 'admin', 'premium'], default: 'free' },
  profile: {
    photo: { type: String },
    about: { type: String },
    rollNumber: { type: String },
    dateOfJoining: { type: Date },
    parents: [{
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      email: { type: String }
    }],
    personalDetails: {
      dob: { type: Date },
      gender: { type: String },
      nationality: { type: String },
      bloodGroup: { type: String },
    },
    address: {
      permanent: {
        address: { type: String },
        pin: { type: String }
      },
      corresponding: {
        address: { type: String },
        pin: { type: String }
      }
    },
    education: {
      college: {
        name: { type: String },
        marks: { type: Number },
      },
      school12th: {
        name: { type: String },
        marks: { type: Number },
      },
      school10th: {
        name: { type: String },
        marks: { type: Number },
      }
    },
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  createdAt: { type: Date, default: Date.now }
});

const resourceSchema = new mongoose.Schema({
  title: { 
      type: String, 
      required: true,
      trim: true
  },
  description: { 
      type: String, 
      required: true 
  },
  imageUrl: { 
      type: String, 
  },
  pdfUrl: { 
      type: String, 
  },
  contentType: {
      type: String, 
      enum: ['ebook', 'notes', 'other'],
      default: 'other'
  },
  author: { 
      type: String, 
      required: true 
  },
  subject: { 
      type: String, 
      required: true 
  },
  pricing: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free'
  },
  difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner'
  },
  createdAt: { 
      type: Date, 
      default: Date.now 
  }
});

const leaderboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  phoneNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  website: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

const QuizQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });



const VideoSchema = new mongoose.Schema({
  title: { 
      type: String, 
      required: true,
      trim: true
  },
  videoUrl: { 
      type: String, 
      required: true,
  },
  description: { 
      type: String, 
      default: '' 
  },
  author: { 
      type: String, 
      required: true 
  },
  chapterName: { 
      type: String, 
      default: '' 
  },
  thumbnailUrl: { 
      type: String,
  },
  isFree: { 
      type: Boolean, 
      default: true 
  },
  isLive: { 
      type: Boolean, 
      default: false 
  },
  isYoutubeLive: { 
      type: Boolean, 
      default: false 
  },
  createdTime: { 
      type: Date, 
      default: Date.now 
  }
}, {
  timestamps: true
});


// Batch Schema
const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  batchId: { type: String, required: true, unique: true },
  description: { type: String },
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
});

// Course Schema
// const courseSchema = new mongoose.Schema({
//   title: { 
//     type: String, 
//     required: true 
//   },
//   courseId: { 
//     type: String, 
//     required: true, 
//     unique: true 
//   },
//   duration: { 
//     type: String, 
//     required: true 
//   },
//   instructorName: { 
//     type: String, 
//     required: true 
//   },
//   thumbnail: { 
//     type: String 
//   },
//   language: { 
//     type: String, 
//     required: true 
//   },
//   access: { 
//     type: String, 
//     enum: ['online', 'offline', 'both'], 
//     required: true 
//   },
//   startDate: { 
//     type: Date, 
//     required: true 
//   },
//   endDate: { 
//     type: Date, 
//     required: true 
//   },
//   about: { 
//     type: String, 
//     required: true 
//   },
//   keyFeatures: [{ 
//     type: String 
//   }],
//   isFree: { 
//     type: Boolean, 
//     default: false 
//   },
//   price: { 
//     type: Number, 
//     default: 0 
//   },
//   totalEnrollments: { 
//     type: Number, 
//     default: 0 
//   },
//   difficulty: { 
//     type: String, 
//     enum: ['Beginner', 'Intermediate', 'Advanced'], 
//     default: 'Beginner' 
//   },
//   createdBy: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User' 
//   },
//   createdAt: { 
//     type: Date, 
//     default: Date.now 
//   },
//   updatedAt: { 
//     type: Date, 
//     default: Date.now 
//   }
// }, { 
//   timestamps: true 
// });

const courseSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructorName: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['online', 'offline', 'both'],
    required: true
  },
  topCourse: {
    type: Boolean,
    default: false
  },
  paid: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to generate unique courseId if not provide
// Course Item Schema
const courseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true
  }
});

const jobListingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  organisationName: { type: String, required: true },
  postName: { type: String, required: true },
  noOfVacancies: { type: Number, required: true },
  qualificationNeeded: { type: String, required: true },
  lastDateToApply: { type: Date, required: true },
  linkToApply: { type: String, required: true },
  sector: { type: String, enum: ['govt', 'pvt'], required: true }
});


// Notes Schema
const NotesSchema = new mongoose.Schema({
  course: { 
    type: String, 
    required: true 
  },
  topic: { 
    type: String, 
    required: true 
  },
  chapterName: { 
    type: String, 
    required: true 
  },
  pdfPath: { 
    type: String, 
    required: true 
  },
  thumbnailPath: { 
    type: String 
  },
  type: {
    type: String,
    enum: ['Notes', 'Books'],
    required: true
  },
  noteId: {
    type: String,
    unique: true,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

NotesSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate a single random string for both pdf and thumbnail
    this.noteId = generateRandomString();

    // Rename PDF file
    if (this.pdfPath) {
      const oldPath = this.pdfPath;
      const ext = path.extname(oldPath);
      const newPdfPath = path.join(
        path.dirname(oldPath), 
        `${this.noteId}${ext}`
      );
      
      fs.renameSync(oldPath, newPdfPath);
      this.pdfPath = newPdfPath;
    }

    // Rename Thumbnail file
    if (this.thumbnailPath) {
      const oldPath = this.thumbnailPath;
      const ext = path.extname(oldPath);
      const newThumbnailPath = path.join(
        path.dirname(oldPath), 
        `${this.noteId}${ext}`
      );
      
      fs.renameSync(oldPath, newThumbnailPath);
      this.thumbnailPath = newThumbnailPath;
    }
  }
  next();
});


// Assignment Schema
const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  deadline: { type: Date, required: true },
  batchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch' 
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course' 
  },
  submissions: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    submissionDate: { type: Date, default: Date.now },
    submissionFile: { type: String },
    marks: { type: Number },
    feedback: { type: String }
  }]
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['deposit', 'withdraw'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  description: { type: String },
  transactionId: { type: String },
  date: { type: Date, default: Date.now }
});

// UI Components Schema
const uiComponentSchema = new mongoose.Schema({
  type: { type: String, enum: ['home', 'navbar', 'sidebar'], required: true },
  name: { type: String, required: true },
  icon: { type: String },
  description: { type: String },
  tag: { type: String }, // For sidebar items
  order: { type: Number, default: 0 } // To maintain order of components
});

const carouselImageSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  imageUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});


const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topic: { type: String, required: true }, // New field
  description: { type: String, required: true }, // New field
  duration: { type: Number, required: true },
  smartTest: { type: Boolean, required: true }, // New field
  userType: { type: String, enum: ["free", "premium"], required: true },
  questions: [
    {
      questionText: { type: String, required: true },
      options: {
        option1: { type: String, required: true },
        option2: { type: String, required: true },
        option3: { type: String, required: true },
        option4: { type: String, required: true }
      },
      correctOption: { type: String, enum: ['option1', 'option2', 'option3', 'option4'], required: true },
      solution: { type: String, required: true } // New field
    }
  ]
});

const validateTest = (req, res, next) => {
  const { title, topic, description, duration, questions } = req.body;

  if (!title || title.trim() === '') return res.status(400).json({ message: 'Title is required' });
  if (!topic || topic.trim() === '') return res.status(400).json({ message: 'Topic is required' });
  if (!description || description.trim() === '') return res.status(400).json({ message: 'Description is required' });
  if (!duration || duration <= 0) return res.status(400).json({ message: 'Invalid duration' });

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: 'At least one question is required' });
  }

  for (let question of questions) {
    if (!question.questionText || question.questionText.trim() === '') {
      return res.status(400).json({ message: 'Question text is required' });
    }

    if (!question.options || 
        !question.options.option1 || 
        !question.options.option2 || 
        !question.options.option3 || 
        !question.options.option4) {
      return res.status(400).json({ message: 'All options are required' });
    }

    if (!question.correctOption || !['option1', 'option2', 'option3', 'option4'].includes(question.correctOption)) {
      return res.status(400).json({ message: 'Invalid correct option' });
    }

    if (!question.solution || question.solution.trim() === '') {
      return res.status(400).json({ message: 'Solution is required' });
    }
  }

  next();
};


const iconSchema = new mongoose.Schema({
  id: String,
  image: String,
  label: String
});

const bookSchema = new mongoose.Schema({
  bookName: { type: String, required: true },
  author: { type: String, required: true },
  description: { type: String, required: true },
  thumbnail: { type: String },
  pdf: { type: String }
});

// Create model

// Create Mongoose Models
const User = mongoose.model('User', userSchema);
const Batch = mongoose.model('Batch', batchSchema);
const Course = mongoose.model('Course', courseSchema);
const CourseItem = mongoose.model('CourseItem', courseItemSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const UIComponent = mongoose.model('UIComponent', uiComponentSchema);
const CarouselImage = mongoose.model('CarouselImage', carouselImageSchema);
const Icon = mongoose.model('Icon', iconSchema);
const Book = mongoose.model('Book', bookSchema);
const Test = mongoose.model('Test', testSchema);
const Video = mongoose.model('Video', VideoSchema);
const Notes = mongoose.model('Notes', NotesSchema);
const QuizQuestion = mongoose.model('QuizQuestion', QuizQuestionSchema);
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
const Resource = mongoose.model('Resource', resourceSchema);
const JobListing = mongoose.model('JobListing', jobListingSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Routes

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Authentication Routes
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id, email: req.user.email }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );
      
      // Redirect to app with token
      res.redirect(`prkedutech://auth-callback?token=${token}&userId=${req.user._id}&name=${encodeURIComponent(req.user.name)}&email=${encodeURIComponent(req.user.email)}&userType=${req.user.userType}`);
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('prkedutech://auth-callback?error=failed');
    }
  }
);

// Facebook routes
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id, email: req.user.email }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );
      
      // Redirect to app with token
      res.redirect(`prkedutech://auth-callback?token=${token}&userId=${req.user._id}&name=${encodeURIComponent(req.user.name)}&email=${encodeURIComponent(req.user.email)}&userType=${req.user.userType}`);
    } catch (error) {
      console.error('Error in Facebook callback:', error);
      res.redirect('prkedutech://auth-callback?error=failed');
    }
  }
);

app.post('/auth/social/token', async (req, res) => {
  try {
    const { provider, providerId, email, name } = req.body;
    
    if (!email || !provider || !providerId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Generate random password (10 characters)
      const randomPassword = Math.random().toString(36).slice(-10);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      // Create new user
      user = new User({
        name: name,
        email: email,
        password: hashedPassword,
        phone: '1234567890', // Required field, but empty for now
        userType: 'free' // Default user type
      });
      
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Social token login error:', error);
    res.status(500).json({ message: 'Server error during social login' });
  }
});

// Register a new user
app.post('/api/auth/signup', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, phone, email, password, userType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      phone,
      email,
      password: hashedPassword,
      userType: userType || 'free'
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        userType: newUser.userType
      }
    });
    } catch (error) {
        console.error('Registration error:', error.message); // Log the specific error message
        console.error(error.stack); // Log the stack trace for more details
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

// Login user
app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.post('/api/users/:userId/reset-password', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a temporary password
    const tempPassword = generateTemporaryPassword();
    
    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    // Send password reset email (implement email sending logic)
    await sendPasswordResetEmail(user.email, tempPassword);

    res.json({ message: 'Password reset successfully. A temporary password has been sent to the user\'s email.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error while resetting password' });
  }
});

app.post('/api/users/reset-password', authenticateToken, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    // Log the password reset action
    console.log(`Password reset for user: ${user.email}`);

    res.json({ 
      message: 'Password reset successfully',
      userEmail: user.email 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Server error while resetting password',
      error: error.message 
    });
  }
});

// Delete user
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find and delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: deletedUser._id,
        email: deletedUser.email
      }
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting user',
      error: error.message 
    });
  }
});

app.get('/api/search/users', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    let users;
    if (!query || query.trim() === '') {
      // If no query, fetch all users
      users = await User.find()
        .select('name email phone userType')
        .limit(50);
    } else {
      // If query exists, perform search
      users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      }).select('name email phone userType')
        .limit(50);
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error while searching users' });
  }
});

app.post('/api/users/reset-default-password', authenticateToken, async (req, res) => {
  try {
    const { userId, defaultPassword } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    // Optional: Log the password reset action
    console.log(`Password reset to default for user: ${user.email}`);

    res.json({ 
      message: 'Password reset to default successfully',
      userEmail: user.email 
    });
  } catch (error) {
    console.error('Default password reset error:', error);
    res.status(500).json({ 
      message: 'Server error while resetting password to default',
      error: error.message 
    });
  }
});

// Google/Facebook OAuth routes would be implemented here
// For brevity, we're focusing on email/password auth in this example

// User Profile Routes

// Get current user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    console.log("User ID from token:", req.user.userId);
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ message: 'Server error while fetching profile', error: error.message });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, about, rollNumber } = req.body;
    
    // Find user and update basic info
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    
    // Update profile fields if provided
    if (!user.profile) user.profile = {};
    if (about) user.profile.about = about;
    if (rollNumber) user.profile.rollNumber = rollNumber;
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// Update profile photo
app.post('/api/profile/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.profile) user.profile = {};
    user.profile.photo = req.file.path;
    await user.save();
    
    res.json({ 
      message: 'Profile photo updated successfully',
      photoUrl: req.file.path
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ message: 'Server error while updating profile photo' });
  }
});

app.get('/api/profile/photo', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.profile || !user.profile.photo) {
      return res.status(404).json({ message: 'Profile photo not found' });
    }
    
    res.json({ 
      photoUrl: user.profile.photo 
    });
  } catch (error) {
    console.error('Error retrieving profile photo:', error);
    res.status(500).json({ message: 'Server error while retrieving profile photo' });
  }
});

// app.post('/api/profile/parents', authenticateToken, async (req, res) => {
//     try {
//       const { parents } = req.body;
      
//       if (!Array.isArray(parents)) {
//         return res.status(400).json({ message: 'Parents must be an array' });
//       }
      
//       const user = await User.findById(req.user.userId);
//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }
      
//       if (!user.profile) user.profile = {};
//       user.profile.parents = parents;
//       await user.save();
      
//       res.json({ 
//         message: 'Parents information updated successfully',
//         parents: user.profile.parents
//       });
//     } catch (error) {
//       console.error('Error updating parents info:', error);
//       res.status(500).json({ message: 'Server error while updating parents information' });
//     }
//   });

app.post('/api/profile/parents', authenticateToken, async (req, res) => {
    try {
      const { parents } = req.body;

      // Validate if 'parents' is an array
      if (!Array.isArray(parents)) {
        return res.status(400).json({ message: 'Parents must be an array' });
      }

      // Validate each parent object to ensure it has the necessary fields
      parents.forEach(parent => {
        if (!parent.name || !parent.relationship || !parent.phone || !parent.email) {
          throw new Error('Each parent must have name, relationship, phone, and email');
        }
      });

      // Find the user by the user ID from the token
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If user has no profile, initialize it
      if (!user.profile) user.profile = {};

      // Update the parents' information with the full details
      user.profile.parents = parents.map(parent => ({
        name: parent.name,
        relationship: parent.relationship,
        phone: parent.phone,
        email: parent.email
      }));

      // Save the updated user document
      await user.save();

      // Respond with a success message and the updated parents' info
      res.json({ 
        message: 'Parents information updated successfully',
        parents: user.profile.parents
      });
    } catch (error) {
      console.error('Error updating parents info:', error);
      res.status(500).json({ message: 'Server error while updating parents information' });
    }
});
  
  // Update personal details
  app.put('/api/profile/personal', authenticateToken, async (req, res) => {
    try {
      const { dob, gender, nationality, bloodGroup, aadharNumber, pan } = req.body;
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!user.profile) user.profile = {};
      if (!user.profile.personalDetails) user.profile.personalDetails = {};
      
      const personalDetails = user.profile.personalDetails;
      if (dob) personalDetails.dob = new Date(dob);
      if (gender) personalDetails.gender = gender;
      if (nationality) personalDetails.nationality = nationality;
      if (bloodGroup) personalDetails.bloodGroup = bloodGroup;
      if (aadharNumber) personalDetails.aadharNumber = aadharNumber;
      if (pan) personalDetails.pan = pan;
      
      await user.save();
      
      res.json({ 
        message: 'Personal details updated successfully',
        personalDetails: user.profile.personalDetails
      });
    } catch (error) {
      console.error('Error updating personal details:', error);
      res.status(500).json({ message: 'Server error while updating personal details' });
    }
  });
  
  // Upload identity documents (Aadhar, PAN, Signature)
  app.post('/api/profile/documents', authenticateToken, upload.fields([
    { name: 'aadharImage', maxCount: 1 },
    { name: 'panImage', maxCount: 1 },
    { name: 'signatureImage', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!user.profile) user.profile = {};
      if (!user.profile.personalDetails) user.profile.personalDetails = {};
      
      const personalDetails = user.profile.personalDetails;
      
      // Update document URLs if files were uploaded
      if (req.files.aadharImage) {
        personalDetails.aadharImage = req.files.aadharImage[0].path;
      }
      
      if (req.files.panImage) {
        personalDetails.panImage = req.files.panImage[0].path;
      }
      
      if (req.files.signatureImage) {
        personalDetails.signatureImage = req.files.signatureImage[0].path;
      }
      
      await user.save();
      
      res.json({ 
        message: 'Documents uploaded successfully',
        documents: {
          aadharImage: personalDetails.aadharImage,
          panImage: personalDetails.panImage,
          signatureImage: personalDetails.signatureImage
        }
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ message: 'Server error while uploading documents' });
    }
  });
  
  // Update address information
  app.put('/api/profile/address', authenticateToken, async (req, res) => {
    try {
      const { permanent, corresponding } = req.body;
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!user.profile) user.profile = {};
      if (!user.profile.address) user.profile.address = { permanent: {}, corresponding: {} };
      
      // Update permanent address if provided
      if (permanent) {
        if (permanent.address) user.profile.address.permanent.address = permanent.address;
        if (permanent.pin) user.profile.address.permanent.pin = permanent.pin;
      }
      
      // Update corresponding address if provided
      if (corresponding) {
        if (corresponding.address) user.profile.address.corresponding.address = corresponding.address;
        if (corresponding.pin) user.profile.address.corresponding.pin = corresponding.pin;
      }
      
      await user.save();
      
      res.json({ 
        message: 'Address information updated successfully',
        address: user.profile.address
      });
    } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ message: 'Server error while updating address' });
    }
  });
  
  // Update educational details
  app.put('/api/profile/education', authenticateToken, async (req, res) => {
    try {
      const { college, school12th, school10th } = req.body;
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!user.profile) user.profile = {};
      if (!user.profile.education) user.profile.education = { college: {}, school12th: {}, school10th: {} };
      
      // Update college details if provided
      if (college) {
        if (college.name) user.profile.education.college.name = college.name;
        if (college.marks) user.profile.education.college.marks = college.marks;
      }
      
      // Update 12th details if provided
      if (school12th) {
        if (school12th.name) user.profile.education.school12th.name = school12th.name;
        if (school12th.marks) user.profile.education.school12th.marks = school12th.marks;
      }
      
      // Update 10th details if provided
      if (school10th) {
        if (school10th.name) user.profile.education.school10th.name = school10th.name;
        if (school10th.marks) user.profile.education.school10th.marks = school10th.marks;
      }
      
      await user.save();
      
      res.json({ 
        message: 'Educational details updated successfully',
        education: user.profile.education
      });
    } catch (error) {
      console.error('Error updating educational details:', error);
      res.status(500).json({ message: 'Server error while updating educational details' });
    }
  });
  
  // Upload educational documents
  app.post('/api/profile/education/documents', authenticateToken, upload.fields([
    { name: 'collegeResult', maxCount: 1 },
    { name: 'result12th', maxCount: 1 },
    { name: 'result10th', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!user.profile) user.profile = {};
      if (!user.profile.education) user.profile.education = { college: {}, school12th: {}, school10th: {} };
      
      // Update education document URLs if files were uploaded
      if (req.files.collegeResult) {
        user.profile.education.college.resultImage = req.files.collegeResult[0].path;
      }
      
      if (req.files.result12th) {
        user.profile.education.school12th.resultImage = req.files.result12th[0].path;
      }
      
      if (req.files.result10th) {
        user.profile.education.school10th.resultImage = req.files.result10th[0].path;
      }
      
      await user.save();
      
      res.json({ 
        message: 'Education documents uploaded successfully',
        documents: {
          collegeResult: user.profile.education.college.resultImage,
          result12th: user.profile.education.school12th.resultImage,
          result10th: user.profile.education.school10th.resultImage
        }
      });
    } catch (error) {
      console.error('Error uploading education documents:', error);
      res.status(500).json({ message: 'Server error while uploading education documents' });
    }
  });
  
  // Batch Management Routes
  
  // Get all batches
  app.get('/api/batches', authenticateToken, async (req, res) => {
    try {
      const batches = await Batch.find();
      res.json(batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({ message: 'Server error while fetching batches' });
    }
  });
  
  // Get batch by ID
  app.get('/api/batches/:id', authenticateToken, async (req, res) => {
    try {
      const batch = await Batch.findById(req.params.id)
        .populate('students', 'name email profile.photo');
      
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      res.json(batch);
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({ message: 'Server error while fetching batch' });
    }
  });
  
  // Create new batch
  app.post('/api/batches', authenticateToken, async (req, res) => {
    try {
      const { name, batchId, description } = req.body;
      
      // Check if batch with this ID already exists
      const existingBatch = await Batch.findOne({ batchId });
      if (existingBatch) {
        return res.status(400).json({ message: 'Batch with this ID already exists' });
      }
      
      const newBatch = new Batch({
        name,
        batchId,
        description
      });
      
      await newBatch.save();
      
      res.status(201).json({
        message: 'Batch created successfully',
        batch: newBatch
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      res.status(500).json({ message: 'Server error while creating batch' });
    }
  });
  
  // Add student to batch
  app.post('/api/batches/:id/students', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.body;
      
      const batch = await Batch.findById(req.params.id);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is already in batch
      if (batch.students.includes(userId)) {
        return res.status(400).json({ message: 'User already in this batch' });
      }
      
      // Add user to batch and batch to user
      batch.students.push(userId);
      user.batches.push(batch._id);
      
      await batch.save();
      await user.save();
      
      // Create notification for user
      user.notifications.push({
        message: `You have been added to batch: ${batch.name}`,
        date: new Date(),
        read: false
      });
      
      await user.save();
      
      res.json({
        message: 'Student added to batch successfully',
        batchId: batch._id,
        userId: user._id
      });
    } catch (error) {
      console.error('Error adding student to batch:', error);
      res.status(500).json({ message: 'Server error while adding student to batch' });
    }
  });
  
  // Remove student from batch
  app.delete('/api/batches/:batchId/students/:userId', authenticateToken, async (req, res) => {
    try {
      const { batchId, userId } = req.params;
      
      const batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove user from batch and batch from user
      batch.students = batch.students.filter(studentId => studentId.toString() !== userId);
      user.batches = user.batches.filter(userBatchId => userBatchId.toString() !== batchId);
      
      await batch.save();
      await user.save();
      
      // Create notification for user
      user.notifications.push({
        message: `You have been removed from batch: ${batch.name}`,
        date: new Date(),
        read: false
      });
      
      await user.save();
      
      res.json({
        message: 'Student removed from batch successfully'
      });
    } catch (error) {
      console.error('Error removing student from batch:', error);
      res.status(500).json({ message: 'Server error while removing student from batch' });
    }
  });
  
  // Course Management Routes
  // app.post('/api/courses', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  //   try {
  //     // Check if user is admin
  //     // if (req.user.userType !== 'admin') {
  //     //   return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
  //     // }
  
  //     // Upload thumbnail to Cloudinary
  //     let thumbnailPath = '';
  //     if (req.files && req.files.thumbnail) {
  //       thumbnailPath = req.files.thumbnail[0].path;
  //       // Store relative path in database
  //       course.thumbnail = `/uploads/thumbnails/${path.basename(thumbnailPath)}`;
  //     }
  
  //     // Prepare course data
  //     const courseData = {
  //       title: req.body.title,
  //       courseId: req.body.courseId, // Allow custom courseId
  //       duration: req.body.duration,
  //       instructorName: req.body.instructorName,
  //       thumbnail: thumbnailUrl,
  //       language: req.body.language,
  //       access: req.body.access,
  //       startDate: req.body.startDate,
  //       endDate: req.body.endDate,
  //       about: req.body.about,
  //       keyFeatures: req.body.keyFeatures ? JSON.parse(req.body.keyFeatures) : [],
  //       isFree: req.body.isFree === 'true',
  //       price: req.body.price || 0,
  //       difficulty: req.body.difficulty || 'Beginner',
  //       createdBy: req.user.userId
  //     };
  
  //     const course = new Course(courseData);
  //     await course.save();
  
  //     res.status(201).json(course);
  //   } catch (error) {
  //     res.status(400).json({ message: error.message });
  //   }
  // });
  
  // // Get all courses (authenticated users)
  // app.get('/api/courses', authenticateToken, async (req, res) => {
  //   try {
  //     const courses = await Course.find();
  //     res.json(courses);
  //   } catch (error) {
  //     res.status(500).json({ message: error.message });
  //   }
  // });
  
  // // Get single course by ID (authenticated users)
  // app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  //   try {
  //     const course = await Course.findById(req.params.id);
  //     if (!course) {
  //       return res.status(404).json({ message: 'Course not found' });
  //     }
  //     res.json(course);
  //   } catch (error) {
  //     res.status(500).json({ message: error.message });
  //   }
  // });
  
  // // Update a course (Admin only)
  // app.put('/api/courses/:id', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  //   try {
  //     // Check if user is admin
  //     // if (req.user.userType !== 'admin') {
  //     //   return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
  //     // }
  
  //     const courseId = req.params.id;
  //     const course = await Course.findById(courseId);
  
  //     if (!course) {
  //       return res.status(404).json({ message: 'Course not found' });
  //     }
  
  //     // Handle thumbnail upload
  //     if (req.files && req.files.pdf) {
  //       const pdfPath = req.files.pdf[0].path;
  //       course.pdf = `/uploads/pdfs/${path.basename(pdfPath)}`;
  //     }
  
  //     // Update course fields
  //     course.title = req.body.title || course.title;
  //     course.duration = req.body.duration || course.duration;
  //     course.instructorName = req.body.instructorName || course.instructorName;
  //     course.language = req.body.language || course.language;
  //     course.access = req.body.access || course.access;
  //     course.startDate = req.body.startDate || course.startDate;
  //     course.endDate = req.body.endDate || course.endDate;
  //     course.about = req.body.about || course.about;
  //     course.keyFeatures = req.body.keyFeatures 
  //       ? JSON.parse(req.body.keyFeatures) 
  //       : course.keyFeatures;
  //     course.isFree = req.body.isFree !== undefined 
  //       ? req.body.isFree === 'true' 
  //       : course.isFree;
  //     course.price = req.body.price || course.price;
  //     course.difficulty = req.body.difficulty || course.difficulty;
  //     course.updatedAt = new Date();
  
  //     await course.save();
  //     res.json(course);
  //   } catch (error) {
  //     res.status(400).json({ message: error.message });
  //   }
  // });
  
  // // Delete a course (Admin only)
  // app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
  //   try {
  //     // Check if user is admin
  //     // if (req.user.userType !== 'admin') {
  //     //   return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
  //     // }
  
  //     const course = await Course.findByIdAndDelete(req.params.id);
  //     if (!course) {
  //       return res.status(404).json({ message: 'Course not found' });
  //     }
  
  //     res.json({ message: 'Course deleted successfully' });
  //   } catch (error) {
  //     res.status(500).json({ message: error.message });
  //   }
  // });

  // // // Get all courses
  // // app.get('/api/courses', authenticateToken, async (req, res) => {
  // //   try {
  // //     const courses = await Course.find();
  // //     res.json(courses);
  // //   } catch (error) {
  // //     console.error('Error fetching courses:', error);
  // //     res.status(500).json({ message: 'Server error while fetching courses' });
  // //   }
  // // });
  
  // // // Get course by ID
  // // app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  // //   try {
  // //     const course = await Course.findById(req.params.id);
      
  // //     if (!course) {
  // //       return res.status(404).json({ message: 'Course not found' });
  // //     }
      
  // //     // Get course items for this course
  // //     const courseItems = await CourseItem.find({ courseId: course._id });
      
  // //     res.json({
  // //       course,
  // //       courseItems
  // //     });
  // //   } catch (error) {
  // //     console.error('Error fetching course:', error);
  // //     res.status(500).json({ message: 'Server error while fetching course' });
  // //   }
  // // });
  

  // // app.post('/api/courses', authenticateToken, upload.single('image'), async (req, res) => {
  // //   try {
  // //     const { name, courseId, description } = req.body;
      
  // //     // Check if course with this ID already exists
  // //     const existingCourse = await Course.findOne({ courseId });
  // //     if (existingCourse) {
  // //       return res.status(400).json({ message: 'Course with this ID already exists' });
  // //     }
      
  // //     const newCourse = new Course({
  // //       name,
  // //       courseId,
  // //       description,
  // //       image: req.file ? req.file.path : null
  // //     });
      
  // //     await newCourse.save();
      
  // //     res.status(201).json({
  // //       message: 'Course created successfully',
  // //       course: newCourse
  // //     });
  // //   } catch (error) {
  // //     console.error('Error creating course:', error);
  // //     res.status(500).json({ message: 'Server error while creating course' });
  // //   }
  // // });
  
  // // // Add course item
  // // app.post('/api/courses/:id/items', authenticateToken, upload.single('image'), async (req, res) => {
  // //   try {
  // //     const { name, description } = req.body;
  // //     const courseId = req.params.id;
      
  // //     // Check if course exists
  // //     const course = await Course.findById(courseId);
  // //     if (!course) {
  // //       return res.status(404).json({ message: 'Course not found' });
  // //     }
      
  // //     const newCourseItem = new CourseItem({
  // //       name,
  // //       description,
  // //       image: req.file ? req.file.path : null,
  // //       courseId
  // //     });
      
  // //     await newCourseItem.save();
      
  // //     res.status(201).json({
  // //       message: 'Course item created successfully',
  // //       courseItem: newCourseItem
  // //     });
  // //   } catch (error) {
  // //     console.error('Error creating course item:', error);
  // //     res.status(500).json({ message: 'Server error while creating course item' });
  // //   }
  // // });
  
  // // // Add student to course
  // // app.post('/api/courses/:id/students', authenticateToken, async (req, res) => {
  // //   try {
  // //     const { userId } = req.body;
      
  // //     const course = await Course.findById(req.params.id);
  // //     if (!course) {
  // //       return res.status(404).json({ message: 'Course not found' });
  // //     }
      
  // //     const user = await User.findById(userId);
  // //     if (!user) {
  // //       return res.status(404).json({ message: 'User not found' });
  // //     }
      
  // //     // Check if user already has this course
  // //     if (user.courses.includes(course._id)) {
  // //       return res.status(400).json({ message: 'User already enrolled in this course' });
  // //     }
      
  // //     // Add course to user
  // //     user.courses.push(course._id);
  // //     await user.save();
      
  // //     // Create notification for user
  // //     user.notifications.push({
  // //       message: `You have been enrolled in course: ${course.name}`,
  // //       date: new Date(),
  // //       read: false
  // //     });
      
  // //     await user.save();
      
  // //     res.json({
  // //       message: 'Student enrolled in course successfully',
  // //       courseId: course._id,
  // //       userId: user._id
  // //     });
  // //   } catch (error) {
  // //     console.error('Error enrolling student in course:', error);
  // //     res.status(500).json({ message: 'Server error while enrolling student in course' });
  // //   }
  // // });
  
  // // Test Performance Routes  
  
  // Assignment Routes
  
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await Course.find();
      res.json(courses);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
  // GET a single course by ID
  app.get('/api/courses/:id', async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      res.json(course);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
  // POST create a new course
  app.post('/api/courses', async (req, res) => {
    const course = new Course({
      courseName: req.body.courseName,
      description: req.body.description,
      instructorName: req.body.instructorName,
      duration: req.body.duration,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      imageUrl: req.body.imageUrl || '',
      language: req.body.language,
      mode: req.body.mode,
      topCourse: req.body.topCourse || false,
      paid: req.body.paid || false
    });
  
    try {
      const newCourse = await course.save();
      res.status(201).json(newCourse);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  
  // PUT update a course
  app.put('/api/courses/:id', async (req, res) => {
    try {
      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      );
  
      if (!updatedCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }
  
      res.json(updatedCourse);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  
  // DELETE a course
  app.delete('/api/courses/:id', async (req, res) => {
    try {
      const deletedCourse = await Course.findByIdAndDelete(req.params.id);
  
      if (!deletedCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }
  
      res.json({ message: 'Course deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });


  // Get all assignments for a user
  app.get('/api/assignments', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // Get batches and courses for the user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Find assignments for user's batches and courses
      const assignments = await Assignment.find({
        $or: [
          { batchId: { $in: user.batches } },
          { courseId: { $in: user.courses } }
        ]
      })
      .populate('batchId', 'name batchId')
      .populate('courseId', 'name courseId')
      .sort({ deadline: 1 });
      
      // Add submission status for each assignment
      const assignmentsWithStatus = assignments.map(assignment => {
        const assignmentObj = assignment.toObject();
        
        // Check if user has submitted
        const userSubmission = assignment.submissions.find(sub => 
          sub.userId.toString() === userId
        );
        
        assignmentObj.submissionStatus = userSubmission 
          ? { submitted: true, date: userSubmission.submissionDate, marks: userSubmission.marks } 
          : { submitted: false };
        
        return assignmentObj;
      });
      
      res.json(assignmentsWithStatus);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ message: 'Server error while fetching assignments' });
    }
  });
  
  // Create a new assignment
  app.post('/api/assignments', authenticateToken, async (req, res) => {
    try {
      const { title, description, deadline, batchId, courseId } = req.body;
      
      // Validate that at least one of batchId or courseId is provided
      if (!batchId && !courseId) {
        return res.status(400).json({ message: 'Either batchId or courseId must be provided' });
      }
      
      // Check if batch exists if batchId provided
      if (batchId) {
        const batch = await Batch.findById(batchId);
        if (!batch) {
          return res.status(404).json({ message: 'Batch not found' });
        }
      }
      
      // Check if course exists if courseId provided
      if (courseId) {
        const course = await Course.findById(courseId);
        if (!course) {
          return res.status(404).json({ message: 'Course not found' });
        }
      }
      
      const newAssignment = new Assignment({
        title,
        description,
        deadline: new Date(deadline),
        batchId: batchId || null,
        courseId: courseId || null,
        submissions: []
      });
      
      await newAssignment.save();
      
      // Create notifications for all students in the batch or course
      if (batchId) {
        const batch = await Batch.findById(batchId).populate('students');
        batch.students.forEach(async (student) => {
          student.notifications.push({
            message: `New assignment in batch ${batch.name}: ${title}`,
            date: new Date(),
            read: false
          });
          await student.save();
        });
      }
      
      if (courseId) {
        const users = await User.find({ courses: courseId });
        for (const user of users) {
          user.notifications.push({
            message: `New assignment in your course: ${title}`,
            date: new Date(),
            read: false
          });
          await user.save();
        }
      }
      
      res.status(201).json({
        message: 'Assignment created successfully',
        assignment: newAssignment
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ message: 'Server error while creating assignment' });
    }
  });
  
  // Submit assignment
  app.post('/api/assignments/:id/submit', authenticateToken, upload.single('file'), async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const userId = req.user.userId;
      
      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      // Check if deadline has passed
      if (new Date() > new Date(assignment.deadline)) {
        return res.status(400).json({ message: 'Assignment deadline has passed' });
      }
      
      // Check if user has already submitted
      const existingSubmission = assignment.submissions.findIndex(sub => 
        sub.userId.toString() === userId
      );
      
      if (existingSubmission !== -1) {
        // Update existing submission
        assignment.submissions[existingSubmission] = {
          userId,
          submissionDate: new Date(),
          submissionFile: req.file ? req.file.path : assignment.submissions[existingSubmission].submissionFile,
          marks: assignment.submissions[existingSubmission].marks,
          feedback: assignment.submissions[existingSubmission].feedback
        };
      } else {
        // Add new submission
        assignment.submissions.push({
          userId,
          submissionDate: new Date(),
          submissionFile: req.file ? req.file.path : null
        });
      }
      
      await assignment.save();
      
      res.json({
        message: 'Assignment submitted successfully',
        submissionDate: new Date()
      });
    } catch (error) {
      console.error('Error submitting assignment:', error);
      res.status(500).json({ message: 'Server error while submitting assignment' });
    }
  });
  
  // Payment Routes
  
  // Get payment history for a user
  app.get('/api/payments', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const payments = await Payment.find({ userId })
        .sort({ date: -1 });
      
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ message: 'Server error while fetching payments' });
    }
  });
  
  // Add a new payment record
  app.post('/api/payments', authenticateToken, async (req, res) => {
    try {
      const { amount, type, description, transactionId } = req.body;
      const userId = req.user.userId;
      
      // Validate payment type
      if (!['deposit', 'withdraw'].includes(type)) {
        return res.status(400).json({ message: 'Invalid payment type' });
      }
      
      const newPayment = new Payment({
        userId,
        amount,
        type,
        description,
        transactionId,
        status: 'pending'
      });
      
      await newPayment.save();
      
      // Create notification for user
      const user = await User.findById(userId);
      if (user) {
        user.notifications.push({
          message: `New ${type} of ₹${amount} recorded. Status: pending`,
          date: new Date(),
          read: false
        });
        
        await user.save();
      }
      
      res.status(201).json({
        message: 'Payment record created successfully',
        payment: newPayment
      });
    } catch (error) {
      console.error('Error creating payment record:', error);
      res.status(500).json({ message: 'Server error while creating payment record' });
    }
  });
  
  // Update payment status
  app.put('/api/payments/:id/status', authenticateToken, async (req, res) => {
    try {
      const { status } = req.body;
      const paymentId = req.params.id;
      
      // Validate status
      if (!['pending', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      payment.status = status;
      await payment.save();
      
      // Create notification for user
      const user = await User.findById(payment.userId);
      if (user) {
        user.notifications.push({
          message: `Your ${payment.type} of ₹${payment.amount} has been ${status}`,
          date: new Date(),
          read: false
        });
        
        await user.save();
      }
      
      res.json({
        message: 'Payment status updated successfully',
        payment
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ message: 'Server error while updating payment status' });
    }
  });
  
  // Notification Routes
  
  // Get all notifications for a user
  app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        unreadCount: user.notifications.filter(n => !n.read).length,
        notifications: user.notifications.sort((a, b) => b.date - a.date)
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Server error while fetching notifications' });
    }
  });
  
  app.put('/api/notifications/read', authenticateToken, async (req, res) => {
    try {
      const { notificationIds } = req.body;
      const userId = req.user.userId;
      
      if (!Array.isArray(notificationIds)) {
        return res.status(400).json({ message: 'notificationIds must be an array' });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Mark specified notifications as read
      user.notifications.forEach(notification => {
        if (notificationIds.includes(notification._id.toString())) {
          notification.read = true;
        }
      });
      
      await user.save();
      
      res.json({
        message: 'Notifications marked as read',
        unreadCount: user.notifications.filter(n => !n.read).length
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      res.status(500).json({ message: 'Server error while marking notifications as read' });
    }
  });
  
  // UI Components Routes
  
  // Get UI components by type
  app.get('/api/ui-components/:type', authenticateToken, async (req, res) => {
    try {
      const { type } = req.params;
      
      // Validate type
      if (!['home', 'navbar', 'sidebar'].includes(type)) {
        return res.status(400).json({ message: 'Invalid UI component type' });
      }
      
      const components = await UIComponent.find({ type }).sort({ order: 1 });
      
      res.json(components);
    } catch (error) {
      console.error('Error fetching UI components:', error);
      res.status(500).json({ message: 'Server error while fetching UI components' });
    }
  });
  
  // Create UI component
  app.post('/api/ui-components', authenticateToken, upload.single('icon'), async (req, res) => {
    try {
      const { type, name, description, tag, order } = req.body;
      
      // Validate type
      if (!['home', 'navbar', 'sidebar'].includes(type)) {
        return res.status(400).json({ message: 'Invalid UI component type' });
      }
      
      const newComponent = new UIComponent({
        type,
        name,
        icon: req.file ? req.file.path : null,
        description,
        tag,
        order: order || 0
      });
      
      await newComponent.save();
      
      res.status(201).json({
        message: 'UI component created successfully',
        component: newComponent
      });
    } catch (error) {
      console.error('Error creating UI component:', error);
      res.status(500).json({ message: 'Server error while creating UI component' });
    }
  });
  
  // Update UI component
  app.put('/api/ui-components/:id', authenticateToken, upload.single('icon'), async (req, res) => {
    try {
      const { type, name, description, tag, order } = req.body;
      const componentId = req.params.id;
      
      const component = await UIComponent.findById(componentId);
      if (!component) {
        return res.status(404).json({ message: 'UI component not found' });
      }
      
      // Update fields if provided
      if (type) component.type = type;
      if (name) component.name = name;
      if (description) component.description = description;
      if (tag) component.tag = tag;
      if (order) component.order = order;
      if (req.file) component.icon = req.file.path;
      
      await component.save();
      
      res.json({
        message: 'UI component updated successfully',
        component
      });
    } catch (error) {
      console.error('Error updating UI component:', error);
      res.status(500).json({ message: 'Server error while updating UI component' });
    }
  });
  
  // Delete UI component
  app.delete('/api/ui-components/:id', authenticateToken, async (req, res) => {
    try {
      const componentId = req.params.id;
      
      const result = await UIComponent.deleteOne({ _id: componentId });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'UI component not found' });
      }
      
      res.json({
        message: 'UI component deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting UI component:', error);
      res.status(500).json({ message: 'Server error while deleting UI component' });
    }
  });
  
  // Search Routes
  
  // Search users
  app.get('/api/search/users', authenticateToken, async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      }).select('name email phone profile.photo')
        .limit(20);
      
      res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Server error while searching users' });
    }
  });
  
  // Search batches and courses
  app.get('/api/search/academic', authenticateToken, async (req, res) => {
    try {
      const { query, type } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      let results = {};
      
      if (!type || type === 'batch') {
        const batches = await Batch.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { batchId: { $regex: query, $options: 'i' } }
          ]
        }).limit(10);
        
        results.batches = batches;
      }
      
      if (!type || type === 'course') {
        const courses = await Course.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { courseId: { $regex: query, $options: 'i' } }
          ]
        }).limit(10);
        
        results.courses = courses;
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error searching academic items:', error);
      res.status(500).json({ message: 'Server error while searching academic items' });
    }
  });

// GET all carousel image URLs
app.get('/api/carouselImages', async (req, res) => {
  try {
    const images = await CarouselImage.find({}).sort({ id: 1 });
    const imageUrls = images.map(img => img.imageUrl);
    res.json(imageUrls);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching carousel images', 
      error: error.message 
    });
  }
});

// GET all carousel images with their full details
app.get('/api/carouselImages/withIds', async (req, res) => {
  try {
    const images = await CarouselImage.find({}).sort({ id: 1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching carousel images', 
      error: error.message 
    });
  }
});

// GET a single carousel image by ID
app.get('/api/carouselImages/:id', async (req, res) => {
  try {
    const image = await CarouselImage.findOne({ id: String(req.params.id) });
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.json(image);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching carousel image', 
      error: error.message 
    });
  }
});

// POST a new carousel image
app.post('/api/carouselImages', upload.single('image'), async (req, res) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Generate relative path for storing in database
    const imageUrl = req.file.path.replace(uploadsDir, '/uploads');

    // Safely get the highest ID
    const highestIdImage = await CarouselImage.findOne().sort({ id: -1 }).lean();
    const newId = highestIdImage ? String(parseInt(highestIdImage.id) + 1) : '1';

    // Save image details to MongoDB
    const newImage = new CarouselImage({
      id: newId,
      imageUrl,
      uploadedAt: new Date()
    });

    await newImage.save();

    res.status(201).json({ 
      message: 'Image uploaded successfully', 
      image: {
        id: newImage.id,
        imageUrl: newImage.imageUrl,
        uploadedAt: newImage.uploadedAt
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      message: 'Error uploading image', 
      error: error.message 
    });
  }
});

// PUT (update) a carousel image
app.put('/api/carouselImages/:id', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'New image file is required' });
    }

    // Generate relative path for storing in database
    const imageUrl = req.file.path.replace(uploadsDir, '/uploads');

    const updatedImage = await CarouselImage.findOneAndUpdate(
      { id: req.params.id },
      { imageUrl, uploadedAt: new Date() },
      { new: true }
    );

    if (!updatedImage) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json({ message: 'Image updated successfully', image: updatedImage });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating carousel image', 
      error: error.message 
    });
  }
});

// DELETE a carousel image
app.delete('/api/carouselImages/:id', async (req, res) => {
  try {
    const deletedImage = await CarouselImage.findOneAndDelete({ id: req.params.id });
    
    if (!deletedImage) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Optional: Delete the physical file
    if (deletedImage.imageUrl) {
      const filePath = path.join(uploadsDir, deletedImage.imageUrl.replace('/uploads', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting carousel image', 
      error: error.message 
    });
  }
});

app.get('/icons', async (req, res) => {
  try {
    const icons = await Icon.find({}).sort({ id: 1 });
    res.json(icons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching icons', error: error.message });
  }
});

// GET a single icon by ID
app.get('/icons/:id', async (req, res) => {
  try {
    const icon = await Icon.findOne({ id: req.params.id });
    if (!icon) {
      return res.status(404).json({ message: 'Icon not found' });
    }
    res.json(icon);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching icon', error: error.message });
  }
});

// POST a new icon
app.post('/icons', async (req, res) => {
  try {
    const { image, label } = req.body;
    
    if (!label) {
      return res.status(400).json({ message: 'Label is required' });
    }
    
    // Get the highest ID and increment it
    const highestIdIcon = await Icon.findOne().sort({ id: -1 });
    const newId = highestIdIcon ? String(parseInt(highestIdIcon.id) + 1) : '1';
    
    const newIcon = new Icon({
      id: newId,
      image: image || '',
      label
    });
    
    await newIcon.save();
    res.status(201).json(newIcon);
  } catch (error) {
    res.status(500).json({ message: 'Error adding new icon', error: error.message });
  }
});

// PUT (update) an icon
app.put('/icons/:id', async (req, res) => {
  try {
    const { image, label } = req.body;
    const updateData = {};
    
    if (image !== undefined) updateData.image = image;
    if (label !== undefined) updateData.label = label;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    const updatedIcon = await Icon.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    
    if (!updatedIcon) {
      return res.status(404).json({ message: 'Icon not found' });
    }
    
    res.json(updatedIcon);
  } catch (error) {
    res.status(500).json({ message: 'Error updating icon', error: error.message });
  }
});

// DELETE an icon
app.delete('/icons/:id', async (req, res) => {
  try {
    const deletedIcon = await Icon.findOneAndDelete({ id: req.params.id });
    
    if (!deletedIcon) {
      return res.status(404).json({ message: 'Icon not found' });
    }
    
    res.json({ message: 'Icon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting icon', error: error.message });
  }
});

app.get('/api/ebooks', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    console.error('Fetch Books Error:', error);
    res.status(500).json({ message: 'Error fetching books', error: error.message });
  }
});

// POST new book
app.post('/api/ebooks', multiUpload, async (req, res) => {
  try {
    const { bookName, author, description } = req.body;
    
    const newBook = new Book({
      bookName,
      author,
      description,
      thumbnail: req.files && req.files['thumbnail'] 
        ? req.files['thumbnail'][0].path 
        : '',
      pdf: req.files && req.files['pdf'] 
        ? req.files['pdf'][0].path 
        : ''
    });

    const savedBook = await newBook.save();
    res.status(201).json(savedBook);
  } catch (error) {
    console.error('Create Book Error:', error);
    res.status(400).json({ message: 'Error creating book', error: error.message });
  }
});

// PUT update book
app.put('/api/ebooks/:id', multiUpload, async (req, res) => {
  try {
    const { bookName, author, description } = req.body;
    
    const updateData = { bookName, author, description };

    // Update thumbnail if new file is uploaded
    if (req.files && req.files['thumbnail']) {
      updateData.thumbnail = req.files['thumbnail'][0].path;
    }

    // Update PDF if new file is uploaded
    if (req.files && req.files['pdf']) {
      updateData.pdf = req.files['pdf'][0].path;
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(updatedBook);
  } catch (error) {
    console.error('Update Book Error:', error);
    res.status(400).json({ message: 'Error updating book', error: error.message });
  }
});

// DELETE book
app.delete('/api/ebooks/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    function deleteLocalFile(filePath) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }    
    
    // Optional: Delete files from Cloudinary
    if (book.thumbnail) {
      const fullPath = path.join(__dirname, book.thumbnail);
      deleteLocalFile(fullPath);
    }
    
    if (book.pdf) {
      const fullPath = path.join(__dirname, book.pdf);
      deleteLocalFile(fullPath);
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete Book Error:', error);
    res.status(500).json({ message: 'Error deleting book', error: error.message });
  }
});


// ✅ Create a new test (POST)
app.post('/api/tests', validateTest, async (req, res) => {
  try {
    const { title, topic, description, duration, smartTest, userType, questions } = req.body;

    // Ensure userType is valid
    if (!["free", "premium"].includes(userType)) {
      return res.status(400).json({ message: "Invalid userType. Must be 'free' or 'premium'." });
    }

    // Ensure smartTest is boolean
    if (typeof smartTest !== "boolean") {
      return res.status(400).json({ message: "smartTest must be true or false." });
    }

    const newTest = new Test({
      title,
      topic,
      description,
      duration,
      smartTest,
      userType,
      questions
    });

    await newTest.save();
    res.status(201).json(newTest);
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✅ Get all tests (Only basic info)
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await Test.find().select('title topic description duration questionCount');
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Get a specific test (Detailed info)
app.get('/api/tests/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const formattedTest = {
      title: test.title,
      topic: test.topic,
      description: test.description,
      duration: test.duration,
      questionCount: test.questions.length,
      questions: test.questions.map((q, index) => ({
        number: index + 1,
        questionText: q.questionText,
        options: {
          option1: q.options.option1,
          option2: q.options.option2,
          option3: q.options.option3,
          option4: q.options.option4
        },
        correctOption: q.correctOption,
        solution: q.solution
      }))
    };

    res.json(formattedTest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ Update a test (PUT)
app.put('/api/tests/:id', validateTest, async (req, res) => {
  try {
    const updatedTest = await Test.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedTest) return res.status(404).json({ message: 'Test not found' });

    res.json(updatedTest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ✅ Delete a test (DELETE)
app.delete('/api/tests/:id', async (req, res) => {
  try {
    const deletedTest = await Test.findByIdAndDelete(req.params.id);

    if (!deletedTest) return res.status(404).json({ message: 'Test not found' });

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Routes

// Create a new test
app.post('/api/tests', validateTest, async (req, res) => {
  try {
    const newTest = new Test(req.body);
    await newTest.save();
    res.status(201).json(newTest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all tests
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await Test.find().select('-questions');
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific test by ID
app.get('/api/tests/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a test
app.put('/api/tests/:id', validateTest, async (req, res) => {
  try {
    const updatedTest = await Test.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json(updatedTest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a test
app.delete('/api/tests/:id', async (req, res) => {
  try {
    const deletedTest = await Test.findByIdAndDelete(req.params.id);

    if (!deletedTest) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Additional route for getting test details with full questions
app.get('/api/tests/:id/details', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json({
      title: test.title,
      duration: test.duration,
      questionCount: test.questions.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/notes', multiUpload, async (req, res) => {
  try {
    const { course, topic, chapterName, type } = req.body;
    
    // Check if PDF and thumbnail were uploaded
    const pdfPath = req.files && req.files.pdf 
      ? req.files.pdf[0].path 
      : null;
    
    const thumbnailPath = req.files && req.files.thumbnail 
      ? req.files.thumbnail[0].path 
      : null;

    const newNote = new Notes({
      course,
      topic,
      chapterName,
      pdfPath,
      thumbnailPath,
      type
    });

    const savedNote = await newNote.save();
    res.status(201).json(savedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all notes
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Notes.find();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get notes by course
app.get('/api/notes/course/:courseName', async (req, res) => {
  try {
    const notes = await Notes.find({ course: req.params.courseName });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single note by ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a note
app.put('/api/notes/:id', multiUpload, async (req, res) => {
  try {
    const { course, topic, chapterName } = req.body;
    
    const updateData = {
      course,
      topic,
      chapterName
    };

    // Update PDF if new one is uploaded
    if (req.files && req.files.pdf) {
      updateData.pdfPath = req.files.pdf[0].path;
    }

    // Update thumbnail if new one is uploaded
    if (req.files && req.files.thumbnail) {
      updateData.thumbnailPath = req.files.thumbnail[0].path;
    }

    const updatedNote = await Notes.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(updatedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const deletedNote = await Notes.findByIdAndDelete(req.params.id);
    
    if (!deletedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Optional: Delete associated PDF and thumbnail files
    if (deletedNote.pdfPath) {
      fs.unlinkSync(deletedNote.pdfPath);
    }
    if (deletedNote.thumbnailPath) {
      fs.unlinkSync(deletedNote.thumbnailPath);
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// app.post('/api/videos/upload', 
//   multiUpload,
//   [
//     body('title').not().isEmpty().withMessage('Title is required'),
//     body('author').not().isEmpty().withMessage('Author is required')
//   ],
//   async (req, res) => {
//     console.log('Files:', req.files);  // Debugging
//     console.log('Body:', req.body);  // Debugging

//     // Check validation errors
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//       // Ensure req.files exists before accessing properties
//       const thumbnailPath = req.files?.thumbnail ? req.files.thumbnail[0].path : null;
//       const pdfPath = req.files?.pdf ? req.files.pdf[0].path : null;

//       // Create new video entry
//       const newVideo = new Video({
//         title: req.body.title,
//         description: req.body.description || '',
//         author: req.body.author,
//         thumbnailPath,
//         pdfPath,
//         isLive: req.body.isLive === 'true',
//         isPaid: req.body.isPaid === 'true',
//         price: parseFloat(req.body.price) || 0
//       });

//       await newVideo.save();

//       res.status(201).json({
//         message: 'Video uploaded successfully',
//         video: newVideo
//       });
//     } catch (error) {
//       console.error('Video upload error:', error);
//       res.status(500).json({
//         message: 'Server error',
//         error: error.message
//       });
//     }
//   }
// );


// // Get Videos Route
// app.get('/api/videos', async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 10, 
//       isLive, 
//       isPaid 
//     } = req.query;
    
//     // Build query filters
//     const query = {};
//     if (isLive !== undefined) query.isLive = isLive === 'true';
//     if (isPaid !== undefined) query.isPaid = isPaid === 'true';

//     const videos = await Video.find(query)
//       .populate('author', 'username email') // Populate author details
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .sort({ createdAt: -1 });

//     const total = await Video.countDocuments(query);

//     res.json({
//       videos,
//       totalPages: Math.ceil(total / limit),
//       currentPage: page
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// // Get Single Video Route
// app.get('/api/videos/:id', async (req, res) => {
//   try {
//     const video = await Video.findById(req.params.id)
//       .populate('author', 'username email');
    
//     if (!video) {
//       return res.status(404).json({ message: 'Video not found' });
//     }

//     res.json(video);
//   } catch (error) {
//     res.status(500).json({ 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

// // Update Video Route
// app.put('/api/videos/:id', 
//   multiUpload, 
//   async (req, res) => {
//     try {
//       const videoId = req.params.id;
//       const updateData = {
//         title: req.body.title,
//         description: req.body.description,
//         isLive: req.body.isLive === 'true',
//         isPaid: req.body.isPaid === 'true',
//         price: parseFloat(req.body.price) || 0,
//         videoUrl: req.body.videoUrl
//       };

//       // Handle file updates
//       if (req.files) {
//         if (req.files.thumbnail) {
//           updateData.thumbnailPath = req.files.thumbnail[0].path;
//         }
//         if (req.files.video) {
//           updateData.videoPath = req.files.video[0].path;
//         }
//       }

//       const updatedVideo = await Video.findByIdAndUpdate(
//         videoId, 
//         updateData, 
//         { new: true }
//       );

//       if (!updatedVideo) {
//         return res.status(404).json({ message: 'Video not found' });
//       }

//       res.json({
//         message: 'Video updated successfully',
//         video: updatedVideo
//       });
//     } catch (error) {
//       res.status(500).json({ 
//         message: 'Server error', 
//         error: error.message 
//       });
//     }
//   }
// );

// // Delete Video Route
// app.delete('/api/videos/:id', async (req, res) => {
//   try {
//     const video = await Video.findByIdAndDelete(req.params.id);
    
//     if (!video) {
//       return res.status(404).json({ message: 'Video not found' });
//     }

//     // Optional: Remove associated files
//     if (video.thumbnailPath) {
//       fs.unlinkSync(video.thumbnailPath);
//     }
//     if (video.videoPath) {
//       fs.unlinkSync(video.videoPath);
//     }

//     res.json({ message: 'Video deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ 
//       message: 'Server error', 
//       error: error.message 
//     });
//   }
// });

app.post('/sources', (req, res) => {
  const { sourceName, values } = req.body;

  // Validate input
  if (!sourceName) {
      return res.status(400).json({ error: 'Source name is required' });
  }

  // Create source with unique ID and optional values
  const newSource = {
      id: uuidv4(),
      sourceName,
      values: values ? values.map(val => ({
          id: uuidv4(),
          value: val.value,
          additionalInfo: val.additionalInfo || null
      })) : []
  };

  sources.push(newSource);
  res.status(201).json(newSource);
});

// READ all sources
app.get('/sources', (req, res) => {
  res.json(sources);
});

// READ a specific source by ID
app.get('/sources/:sourceId', (req, res) => {
  const source = sources.find(s => s.id === req.params.sourceId);
  
  if (!source) {
      return res.status(404).json({ error: 'Source not found' });
  }
  
  res.json(source);
});

// UPDATE a source
app.put('/sources/:sourceId', (req, res) => {
  const { sourceName, values } = req.body;
  const sourceIndex = sources.findIndex(s => s.id === req.params.sourceId);

  if (sourceIndex === -1) {
      return res.status(404).json({ error: 'Source not found' });
  }

  // Update source details
  sources[sourceIndex] = {
      ...sources[sourceIndex],
      sourceName: sourceName || sources[sourceIndex].sourceName,
      values: values ? values.map(val => ({
          id: val.id || uuidv4(),
          value: val.value,
          additionalInfo: val.additionalInfo || null
      })) : sources[sourceIndex].values
  };

  res.json(sources[sourceIndex]);
});

// DELETE a source
app.delete('/sources/:sourceId', (req, res) => {
  const sourceIndex = sources.findIndex(s => s.id === req.params.sourceId);

  if (sourceIndex === -1) {
      return res.status(404).json({ error: 'Source not found' });
  }

  sources.splice(sourceIndex, 1);
  res.status(204).send();
});

// ADD a value to a specific source
app.post('/sources/:sourceId/values', (req, res) => {
  const { value, additionalInfo } = req.body;
  const sourceIndex = sources.findIndex(s => s.id === req.params.sourceId);

  if (sourceIndex === -1) {
      return res.status(404).json({ error: 'Source not found' });
  }

  const newValue = {
      id: uuidv4(),
      value,
      additionalInfo: additionalInfo || null
  };

  sources[sourceIndex].values.push(newValue);
  res.status(201).json(newValue);
});

// UPDATE a specific value in a source
app.put('/sources/:sourceId/values/:valueId', (req, res) => {
  const { value, additionalInfo } = req.body;
  const sourceIndex = sources.findIndex(s => s.id === req.params.sourceId);

  if (sourceIndex === -1) {
      return res.status(404).json({ error: 'Source not found' });
  }

  const valueIndex = sources[sourceIndex].values.findIndex(v => v.id === req.params.valueId);

  if (valueIndex === -1) {
      return res.status(404).json({ error: 'Value not found' });
  }

  sources[sourceIndex].values[valueIndex] = {
      ...sources[sourceIndex].values[valueIndex],
      value: value || sources[sourceIndex].values[valueIndex].value,
      additionalInfo: additionalInfo || sources[sourceIndex].values[valueIndex].additionalInfo
  };

  res.json(sources[sourceIndex].values[valueIndex]);
});

// DELETE a specific value from a source
app.delete('/sources/:sourceId/values/:valueId', (req, res) => {
  const sourceIndex = sources.findIndex(s => s.id === req.params.sourceId);

  if (sourceIndex === -1) {
      return res.status(404).json({ error: 'Source not found' });
  }

  const valueIndex = sources[sourceIndex].values.findIndex(v => v.id === req.params.valueId);

  if (valueIndex === -1) {
      return res.status(404).json({ error: 'Value not found' });
  }

  sources[sourceIndex].values.splice(valueIndex, 1);
  res.status(204).send();
});


app.post('/questions', async (req, res) => {
  try {
    const newQuestion = new QuizQuestion(req.body);
    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// READ - Get all questions
app.get('/questions', async (req, res) => {
  try {
    const questions = await QuizQuestion.find();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// READ - Get a specific question by ID
app.get('/questions/:id', async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE - Update a question by ID
app.put('/questions/:id', async (req, res) => {
  try {
    const updatedQuestion = await QuizQuestion.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json(updatedQuestion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE - Delete a question by ID
app.delete('/questions/:id', async (req, res) => {
  try {
    const deletedQuestion = await QuizQuestion.findByIdAndDelete(req.params.id);
    
    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post('/api/leaderboard', async (req, res) => {
  try {
    const newEntry = new Leaderboard({
      name: req.body.name,
      designation: req.body.designation,
      phoneNo: req.body.phoneNo,
      email: req.body.email,
      website: req.body.website
    });

    const savedEntry = await newEntry.save();
    res.status(201).json({
      message: 'Leaderboard entry created successfully',
      data: savedEntry
    });
  } catch (error) {
    res.status(400).json({
      message: 'Error creating leaderboard entry',
      error: error.message
    });
  }
});

// READ - Get all leaderboard entries
app.get('/api/leaderboard', async (req, res) => {
  try {
    const entries = await Leaderboard.find();
    res.status(200).json({
      message: 'Leaderboard entries retrieved successfully',
      data: entries
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving leaderboard entries',
      error: error.message
    });
  }
});

// READ - Get a single leaderboard entry by ID
app.get('/api/leaderboard/:id', async (req, res) => {
  try {
    const entry = await Leaderboard.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({
        message: 'Leaderboard entry not found'
      });
    }

    res.status(200).json({
      message: 'Leaderboard entry retrieved successfully',
      data: entry
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving leaderboard entry',
      error: error.message
    });
  }
});

// UPDATE - Update a leaderboard entry
app.put('/api/leaderboard/:id', async (req, res) => {
  try {
    const updatedEntry = await Leaderboard.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        message: 'Leaderboard entry not found'
      });
    }

    res.status(200).json({
      message: 'Leaderboard entry updated successfully',
      data: updatedEntry
    });
  } catch (error) {
    res.status(400).json({
      message: 'Error updating leaderboard entry',
      error: error.message
    });
  }
});

// DELETE - Delete a leaderboard entry
app.delete('/api/leaderboard/:id', async (req, res) => {
  try {
    const deletedEntry = await Leaderboard.findByIdAndDelete(req.params.id);

    if (!deletedEntry) {
      return res.status(404).json({
        message: 'Leaderboard entry not found'
      });
    }

    res.status(200).json({
      message: 'Leaderboard entry deleted successfully',
      data: deletedEntry
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting leaderboard entry',
      error: error.message
    });
  }
});

app.post('/api/notes', multiUpload, async (req, res) => {
  try {
    const { course, topic, chapterName, type } = req.body;
    
    // Validate type
    if (!['Notes', 'Books'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be Notes or Books.' });
    }
    
    // Generate unique ID for the note
    const noteId = uuidv4();
    
    // Construct full paths for PDF and thumbnail
    const pdfPath = req.files && req.files.pdf 
      ? `/uploads/notes/pdf/${path.basename(req.files.pdf[0].path)}` 
      : null;
    
    const thumbnailPath = req.files && req.files.thumbnail 
      ? `/uploads/notes/thumbnails/${path.basename(req.files.thumbnail[0].path)}` 
      : null;

    const newNote = new Notes({
      course,
      topic,
      chapterName,
      pdfPath,
      thumbnailPath,
      type,
      noteId
    });

    const savedNote = await newNote.save();
    res.status(201).json(savedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update notes endpoint
app.put('/notes/:id', multiUpload, async (req, res) => {
  try {
    const { course, topic, chapterName, type } = req.body;
    
    // Validate type
    if (type && !['Notes', 'Books'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be Notes or Books.' });
    }

    const updateData = {
      course,
      topic,
      chapterName,
      ...(type && { type })
    };

    // Update PDF if new one is uploaded
    if (req.files && req.files.pdf) {
      updateData.pdfPath = `/uploads/notes/pdf/${path.basename(req.files.pdf[0].path)}`;
    }

    // Update thumbnail if new one is uploaded
    if (req.files && req.files.thumbnail) {
      updateData.thumbnailPath = `/uploads/notes/thumbnails/${path.basename(req.files.thumbnail[0].path)}`;
    }

    const updatedNote = await Notes.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(updatedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete notes endpoint
app.delete('/notes/:id', async (req, res) => {
  try {
    const deletedNote = await Notes.findByIdAndDelete(req.params.id);
    
    if (!deletedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Delete associated PDF file
    if (deletedNote.pdfPath) {
      try {
        fs.unlinkSync(deletedNote.pdfPath);
      } catch (err) {
        console.error('Error deleting PDF file:', err);
      }
    }

    // Delete associated thumbnail file
    if (deletedNote.thumbnailPath) {
      try {
        fs.unlinkSync(deletedNote.thumbnailPath);
      } catch (err) {
        console.error('Error deleting thumbnail file:', err);
      }
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Previous code remains the same...

// Get all notes
app.get('/api/notes', async (req, res) => {
  try {
    const { type, course } = req.query;
    
    // Build query object based on optional filters
    let query = {};
    if (type) {
      query.type = type;
    }
    if (course) {
      query.course = course;
    }

    const notes = await Notes.find(query);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get notes by type
app.get('/api/notes/type/:type', async (req, res) => {
  try {
    const notes = await Notes.find({ type: req.params.type });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get notes by course
app.get('/api/notes/course/:courseName', async (req, res) => {
  try {
    const notes = await Notes.find({ course: req.params.courseName });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single note by ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a note by its unique noteId
app.get('/api/notes/unique/:noteId', async (req, res) => {
  try {
    const note = await Notes.findOne({ noteId: req.params.noteId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.post('/videos', async (req, res) => {
  try {
    const { title, videoUrl, author, description, chapterName, thumbnailUrl, isFree, isLive, isYoutubeLive } = req.body;
    
    if (!title || !videoUrl || !author) {
      return res.status(400).json({ message: 'Title, videoUrl, and author are required.' });
    }
    
    const newVideo = new Video({
      title,
      videoUrl,
      author,
      description: description || '',
      chapterName: chapterName || '',
      thumbnailUrl,
      isFree: isFree ?? true,
      isLive: isLive ?? false,
      isYoutubeLive: isYoutubeLive ?? false
    });
    
    const savedVideo = await newVideo.save();
    res.status(201).json(savedVideo);
  } catch (error) {
    res.status(400).json({ message: 'Error creating video', error: error.message });
  }
});

// READ - Get all videos
app.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching videos', error: error.message });
  }
});

// READ - Get a single video by ID
app.get('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching video', error: error.message });
  }
});

// UPDATE - Update a video
app.put('/videos/:id', async (req, res) => {
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedVideo) return res.status(404).json({ message: 'Video not found' });
    res.json(updatedVideo);
  } catch (error) {
    res.status(400).json({ message: 'Error updating video', error: error.message });
  }
});

// DELETE - Delete a video
app.delete('/videos/:id', async (req, res) => {
  try {
    const deletedVideo = await Video.findByIdAndDelete(req.params.id);
    if (!deletedVideo) return res.status(404).json({ message: 'Video not found' });
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting video', error: error.message });
  }
});

// Advanced Search - Filter Videos
app.get('/videos/search', async (req, res) => {
  try {
    const { title, author, isFree, isLive, chapterName } = req.query;
    const filter = {};
    
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (author) filter.author = { $regex: author, $options: 'i' };
    if (isFree !== undefined) filter.isFree = isFree === 'true';
    if (isLive !== undefined) filter.isLive = isLive === 'true';
    if (chapterName) filter.chapterName = { $regex: chapterName, $options: 'i' };
    
    const videos = await Video.find(filter);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error searching videos', error: error.message });
  }
});

// app.post('/videos', async (req, res) => {
//   try {
//       const newVideo = new Video(req.body);
//       const savedVideo = await newVideo.save();
//       res.status(201).json(savedVideo);
//   } catch (error) {
//       res.status(400).json({ 
//           message: 'Error creating video', 
//           error: error.message
//       });
//   }
// });

// // READ - Get all videos
// app.get('/videos', async (req, res) => {
//   try {
//       const videos = await Video.find();
//       res.json(videos);
//   } catch (error) {
//       res.status(500).json({ 
//           message: 'Error fetching videos', 
//           error: error.message 
//       });
//   }
// });

// // READ - Get a single video by ID
// app.get('/videos/:id', async (req, res) => {
//   try {
//       const video = await Video.findById(req.params.id);
//       if (!video) {
//           return res.status(404).json({ message: 'Video not found' });
//       }
//       res.json(video);
//   } catch (error) {
//       res.status(500).json({ 
//           message: 'Error fetching video', 
//           error: error.message 
//       });
//   }
// });

// // UPDATE - Update a video
// app.put('/videos/:id', async (req, res) => {
//   try {
//       const updatedVideo = await Video.findByIdAndUpdate(
//           req.params.id, 
//           req.body, 
//           { new: true, runValidators: true }
//       );
      
//       if (!updatedVideo) {
//           return res.status(404).json({ message: 'Video not found' });
//       }
      
//       res.json(updatedVideo);
//   } catch (error) {
//       res.status(400).json({ 
//           message: 'Error updating video', 
//           error: error.message 
//       });
//   }
// });

// // DELETE - Delete a video
// app.delete('/videos/:id', async (req, res) => {
//   try {
//       const deletedVideo = await Video.findByIdAndDelete(req.params.id);
      
//       if (!deletedVideo) {
//           return res.status(404).json({ message: 'Video not found' });
//       }
      
//       res.json({ message: 'Video deleted successfully' });
//   } catch (error) {
//       res.status(500).json({ 
//           message: 'Error deleting video', 
//           error: error.message 
//       });
//   }
// });

// // Advanced Search - Filter Videos
// app.get('/videos/search', async (req, res) => {
//   try {
//       const { 
//           title, 
//           author, 
//           isFree, 
//           isLive, 
//           chapterName 
//       } = req.query;

//       const filter = {};
      
//       if (title) filter.title = { $regex: title, $options: 'i' };
//       if (author) filter.author = { $regex: author, $options: 'i' };
//       if (isFree !== undefined) filter.isFree = isFree === 'true';
//       if (isLive !== undefined) filter.isLive = isLive === 'true';
//       if (chapterName) filter.chapterName = { $regex: chapterName, $options: 'i' };

//       const videos = await Video.find(filter);
//       res.json(videos);
//   } catch (error) {
//       res.status(500).json({ 
//           message: 'Error searching videos', 
//           error: error.message 
//       });
//   }
// });

app.post('/resources', async (req, res) => {
  try {
      const { title, description, imageUrl, pdfUrl, contentType, author, subject, pricing, difficultyLevel } = req.body;

      // Validate required fields
      if (!title || !description || !author || !subject) {
          return res.status(400).json({ message: "Title, description, author, and subject are required." });
      }

      const newResource = new Resource({
          title: title.trim(),
          description,
          imageUrl,
          pdfUrl,
          contentType: contentType || 'other',
          author,
          subject,
          pricing: pricing || 'free',
          difficultyLevel: difficultyLevel || 'beginner'
      });

      const savedResource = await newResource.save();
      res.status(201).json(savedResource);
  } catch (error) {
      res.status(400).json({ message: error.message });
  }
});


// READ - Get all resources
app.get('/resources', async (req, res) => {
  try {
      const resources = await Resource.find();
      res.json(resources);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

// READ - Get resource by ID
app.get('/resources/:id', async (req, res) => {
  try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
          return res.status(404).json({ message: 'Resource not found' });
      }
      res.json(resource);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

// UPDATE - Update a resource
app.put('/resources/:id', async (req, res) => {
  try {
      const updatedResource = await Resource.findByIdAndUpdate(
          req.params.id, 
          req.body, 
          { new: true, runValidators: true }
      );
      
      if (!updatedResource) {
          return res.status(404).json({ message: 'Resource not found' });
      }
      
      res.json(updatedResource);
  } catch (error) {
      res.status(400).json({ message: error.message });
  }
});

// PATCH - Partially update a resource
app.patch('/resources/:id', async (req, res) => {
  try {
      const updatedResource = await Resource.findByIdAndUpdate(
          req.params.id, 
          req.body, 
          { new: true, runValidators: true }
      );
      
      if (!updatedResource) {
          return res.status(404).json({ message: 'Resource not found' });
      }
      
      res.json(updatedResource);
  } catch (error) {
      res.status(400).json({ message: error.message });
  }
});

// DELETE - Delete a resource
app.delete('/resources/:id', async (req, res) => {
  try {
      const deletedResource = await Resource.findByIdAndDelete(req.params.id);
      
      if (!deletedResource) {
          return res.status(404).json({ message: 'Resource not found' });
      }
      
      res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await JobListing.find();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET job listing by ID
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job listing not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new job listing
app.post('/api/jobs', async (req, res) => {
  const jobListing = new JobListing({
    title: req.body.title,
    organisationName: req.body.organisationName,
    postName: req.body.postName,
    noOfVacancies: req.body.noOfVacancies,
    qualificationNeeded: req.body.qualificationNeeded,
    lastDateToApply: req.body.lastDateToApply,
    linkToApply: req.body.linkToApply,
    sector: req.body.sector
  });

  try {
    const newJobListing = await jobListing.save();
    res.status(201).json(newJobListing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update job listing by ID
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job listing not found' });
    
    // Update fields
    if (req.body.title) job.title = req.body.title;
    if (req.body.organisationName) job.organisationName = req.body.organisationName;
    if (req.body.postName) job.postName = req.body.postName;
    if (req.body.noOfVacancies) job.noOfVacancies = req.body.noOfVacancies;
    if (req.body.qualificationNeeded) job.qualificationNeeded = req.body.qualificationNeeded;
    if (req.body.lastDateToApply) job.lastDateToApply = req.body.lastDateToApply;
    if (req.body.linkToApply) job.linkToApply = req.body.linkToApply;
    if (req.body.sector) job.sector = req.body.sector;
    
    const updatedJob = await job.save();
    res.json(updatedJob);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE job listing by ID
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job listing not found' });
    
    await JobListing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job listing deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search job listings by different parameters
app.get('/api/jobs/search', async (req, res) => {
  try {
    const query = {};
    
    // Build query based on provided parameters
    if (req.query.title) query.title = { $regex: req.query.title, $options: 'i' };
    if (req.query.organisationName) query.organisationName = { $regex: req.query.organisationName, $options: 'i' };
    if (req.query.postName) query.postName = { $regex: req.query.postName, $options: 'i' };
    if (req.query.sector) query.sector = req.query.sector;
    
    const jobs = await JobListing.find(query);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

  // Vercel Serverless Configuration
  if (process.env.VERCEL) {
    // Export the Express app as a Vercel serverless function
    module.exports = app;
  } else {
    // Start the server for local development
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
