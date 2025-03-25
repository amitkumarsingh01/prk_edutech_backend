// index.js - Complete Node.js backend for user management system
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { body, validationResult } = require('express-validator');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aksmlibts:amit@cluster0.vqusi.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Configure Cloudinary for file uploads
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user-uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf']
  }
});

const upload = multer({ storage: storage });

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
      relationship: { type: String },  // Add relationship field
      phone: { type: String },
      email: { type: String }
    }],
    personalDetails: {
      dob: { type: Date },
      gender: { type: String },
      nationality: { type: String },
      bloodGroup: { type: String },
      aadharNumber: { type: String },
      aadharImage: { type: String },
      pan: { type: String },
      panImage: { type: String },
      signatureImage: { type: String }
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
        resultImage: { type: String }
      },
      school12th: {
        name: { type: String },
        marks: { type: Number },
        resultImage: { type: String }
      },
      school10th: {
        name: { type: String },
        marks: { type: Number },
        resultImage: { type: String }
      }
    }
  },
  batches: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch' 
  }],
  courses: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course' 
  }],
  notifications: [{
    message: { type: String },
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
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
const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  courseId: { type: String, required: true, unique: true },
  description: { type: String },
  image: { type: String }
});

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

// Test Performance Schema
const testSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  batchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch' 
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course' 
  },
  testType: { type: String, enum: ['batch', 'course'], required: true },
  date: { type: Date, default: Date.now },
  marks: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  description: { type: String }
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
  id: String,
  imageUrl: String
});

const iconSchema = new mongoose.Schema({
  id: String,
  image: String,
  label: String
});
// Create model

// Create Mongoose Models
const User = mongoose.model('User', userSchema);
const Batch = mongoose.model('Batch', batchSchema);
const Course = mongoose.model('Course', courseSchema);
const CourseItem = mongoose.model('CourseItem', courseItemSchema);
const Test = mongoose.model('Test', testSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const UIComponent = mongoose.model('UIComponent', uiComponentSchema);
const CarouselImage = mongoose.model('CarouselImage', carouselImageSchema);
const Icon = mongoose.model('Icon', iconSchema);

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
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('batches', 'name batchId')
      .populate('courses', 'name courseId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
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
  
  // Get all courses
  app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
      const courses = await Course.find();
      res.json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ message: 'Server error while fetching courses' });
    }
  });
  
  // Get course by ID
  app.get('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      // Get course items for this course
      const courseItems = await CourseItem.find({ courseId: course._id });
      
      res.json({
        course,
        courseItems
      });
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ message: 'Server error while fetching course' });
    }
  });
  

  app.post('/api/courses', authenticateToken, upload.single('image'), async (req, res) => {
    try {
      const { name, courseId, description } = req.body;
      
      // Check if course with this ID already exists
      const existingCourse = await Course.findOne({ courseId });
      if (existingCourse) {
        return res.status(400).json({ message: 'Course with this ID already exists' });
      }
      
      const newCourse = new Course({
        name,
        courseId,
        description,
        image: req.file ? req.file.path : null
      });
      
      await newCourse.save();
      
      res.status(201).json({
        message: 'Course created successfully',
        course: newCourse
      });
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ message: 'Server error while creating course' });
    }
  });
  
  // Add course item
  app.post('/api/courses/:id/items', authenticateToken, upload.single('image'), async (req, res) => {
    try {
      const { name, description } = req.body;
      const courseId = req.params.id;
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      const newCourseItem = new CourseItem({
        name,
        description,
        image: req.file ? req.file.path : null,
        courseId
      });
      
      await newCourseItem.save();
      
      res.status(201).json({
        message: 'Course item created successfully',
        courseItem: newCourseItem
      });
    } catch (error) {
      console.error('Error creating course item:', error);
      res.status(500).json({ message: 'Server error while creating course item' });
    }
  });
  
  // Add student to course
  app.post('/api/courses/:id/students', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.body;
      
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user already has this course
      if (user.courses.includes(course._id)) {
        return res.status(400).json({ message: 'User already enrolled in this course' });
      }
      
      // Add course to user
      user.courses.push(course._id);
      await user.save();
      
      // Create notification for user
      user.notifications.push({
        message: `You have been enrolled in course: ${course.name}`,
        date: new Date(),
        read: false
      });
      
      await user.save();
      
      res.json({
        message: 'Student enrolled in course successfully',
        courseId: course._id,
        userId: user._id
      });
    } catch (error) {
      console.error('Error enrolling student in course:', error);
      res.status(500).json({ message: 'Server error while enrolling student in course' });
    }
  });
  
  // Test Performance Routes
  
  // Get all tests for a user
  app.get('/api/tests', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const tests = await Test.find({ userId })
        .populate('batchId', 'name batchId')
        .populate('courseId', 'name courseId')
        .sort({ date: -1 });
      
      res.json(tests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({ message: 'Server error while fetching tests' });
    }
  });
  
  // Add a new test record
  app.post('/api/tests', authenticateToken, async (req, res) => {
    try {
      const { userId, batchId, courseId, testType, marks, totalMarks, description } = req.body;
      
      // Validate test type
      if (!['batch', 'course'].includes(testType)) {
        return res.status(400).json({ message: 'Invalid test type' });
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
      
      const newTest = new Test({
        userId,
        batchId: batchId || null,
        courseId: courseId || null,
        testType,
        marks,
        totalMarks,
        description
      });
      
      await newTest.save();
      
      // Create notification for user
      const user = await User.findById(userId);
      if (user) {
        user.notifications.push({
          message: `New test result added: ${marks}/${totalMarks} in ${testType === 'batch' ? 'batch test' : 'course test'}`,
          date: new Date(),
          read: false
        });
        
        await user.save();
      }
      
      res.status(201).json({
        message: 'Test record created successfully',
        test: newTest
      });
    } catch (error) {
        console.error('Error creating test record:', error);
        res.status(500).json({ message: 'Server error while creating test record', error: error.message });
    }      
  });
  
  // Assignment Routes
  
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

  // GET all carousel images
app.get('/api/carouselImages', async (req, res) => {
  try {
    const images = await CarouselImage.find({}).sort({ id: 1 });
    const imageUrls = images.map(img => img.imageUrl);
    res.json(imageUrls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching carousel images', error: error.message });
  }
});

// GET all carousel images with their IDs
app.get('/api/carouselImages/withIds', async (req, res) => {
  try {
    const images = await CarouselImage.find({}).sort({ id: 1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching carousel images', error: error.message });
  }
});

// GET a single carousel image by ID
app.get('/api/carouselImages/:id', async (req, res) => {
  try {
    const image = await CarouselImage.findOne({ id: req.params.id });
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.json(image);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching carousel image', error: error.message });
  }
});

// POST a new carousel image
app.post('/api/carouselImages', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }
    
    // Get the highest ID and increment it
    const highestIdImage = await CarouselImage.findOne().sort({ id: -1 });
    const newId = highestIdImage ? String(parseInt(highestIdImage.id) + 1) : '1';
    
    const newImage = new CarouselImage({
      id: newId,
      imageUrl
    });
    
    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    res.status(500).json({ message: 'Error adding new carousel image', error: error.message });
  }
});

// PUT (update) a carousel image
app.put('/api/carouselImages/:id', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }
    
    const updatedImage = await CarouselImage.findOneAndUpdate(
      { id: req.params.id },
      { imageUrl },
      { new: true }
    );
    
    if (!updatedImage) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.json(updatedImage);
  } catch (error) {
    res.status(500).json({ message: 'Error updating carousel image', error: error.message });
  }
});

// DELETE a carousel image
app.delete('/api/carouselImages/:id', async (req, res) => {
  try {
    const deletedImage = await CarouselImage.findOneAndDelete({ id: req.params.id });
    
    if (!deletedImage) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting carousel image', error: error.message });
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
