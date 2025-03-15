// db-init.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aksmlibts:amit@cluster0.vqusi.mongodb.net/?retryWrites=true&w=majority')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create schema for carousel images
const carouselImageSchema = new mongoose.Schema({
  id: String,
  imageUrl: String
});

// Create model
const CarouselImage = mongoose.model('CarouselImage', carouselImageSchema);

// Initial image data
const initialImages = [
  {
    id: '1',
    imageUrl: 'https://media.istockphoto.com/id/525409405/photo/rear-view-of-teenage-students-raising-hands-in-classroom.jpg?s=612x612&w=0&k=20&c=iae_uTM77vK3N1J6q0Zi7kvfOTjlirp2P5MIVswbxmo='
  },
  {
    id: '2',
    imageUrl: 'https://media.istockphoto.com/id/1353890525/photo/young-man-is-working-on-laptop.jpg?s=612x612&w=0&k=20&c=CeU7BOpOoom1841CoZ3i8tFtalQdUi-nBzlLSFMrxR4='
  },
  {
    id: '3',
    imageUrl: 'https://media.istockphoto.com/id/1358014313/photo/group-of-elementary-students-having-computer-class-with-their-teacher-in-the-classroom.jpg?s=612x612&w=0&k=20&c=3xsykmHXFa9ejL_sP2Xxiow7zdtmKvg15UxXFfgR98Q='
  },
  {
    id: '4',
    imageUrl: 'https://media.istockphoto.com/id/525409577/photo/elevated-view-of-students-writing-their-gcse-exam.jpg?s=612x612&w=0&k=20&c=GYrsKdAtBjK0q2wjkIq8PVOW1wz0c9Qr8KjA6o-R1v0='
  },
  {
    id: '5',
    imageUrl: 'https://media.istockphoto.com/id/1468140092/photo/happy-elementary-students-raising-their-hands-on-a-class-at-school.jpg?s=612x612&w=0&k=20&c=BrkqxwR_nW4WzbDCAmpQEyF-QYvML9EktH4hhCj-76U='
  },
  {
    id: '6',
    imageUrl: 'https://media.istockphoto.com/id/1401178943/photo/young-lady-using-a-laptop-to-do-research-on-the-internet-woman-working-on-a-project-mixed.jpg?s=612x612&w=0&k=20&c=pptIVFV4VH21H1wict2VTWg2xvb8ykmsmddxiV3iPog='
  },
  {
    id: '7',
    imageUrl: 'https://media.istockphoto.com/id/1425235236/photo/side-view-of-youthful-african-american-schoolboy-working-in-front-of-laptop.jpg?s=612x612&w=0&k=20&c=-mIYq_YHruqvNr5DZ4GMf7BrwKNug3M3U_JwLnIxvLU='
  },
  {
    id: '8',
    imageUrl: 'https://media.istockphoto.com/id/1278975233/photo/high-school-students-doing-exam-in-classroom.jpg?s=612x612&w=0&k=20&c=YxR9rTScBny8zJuZchXhKx08jxpP354Rv4XD6q-0xS8='
  },
  {
    id: '9',
    imageUrl: 'https://media.istockphoto.com/id/1307457391/photo/happy-black-student-raising-arm-to-answer-question-while-attending-class-with-her-university.jpg?s=612x612&w=0&k=20&c=iZaZFyC-WqlqSQc4elqUNPTxLvWPe8P5Tb_YdZnrI9Q='
  },
  {
    id: '10',
    imageUrl: 'https://media.istockphoto.com/id/1446488662/photo/group-work-of-school-children-students-discuss-a-collective-project-at-school.jpg?s=612x612&w=0&k=20&c=TcK_54lNHDS8i3kOI00hiXjz8_ZD9r7_Y9sV-Hz8pHU='
  }
];

// Function to seed the database
const seedDatabase = async () => {
  try {
    // Clear existing data
    await CarouselImage.deleteMany({});
    console.log('Existing carousel images cleared');
    
    // Insert new data
    await CarouselImage.insertMany(initialImages);
    console.log('Successfully seeded carousel images');
    
    // Disconnect from MongoDB
    mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.disconnect();
  }
};

// Run the seeding function
seedDatabase();