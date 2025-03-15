// icon-db-init.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create schema for icons
const iconSchema = new mongoose.Schema({
  id: String,
  image: String,  // URL to the image
  label: String
});

// Create model
const Icon = mongoose.model('Icon', iconSchema);

// Initial icon data
const initialIcons = [
  { id: '1', image: 'https://imgs.search.brave.com/QS7NoATo7Ox7h8HzSYMvN-A6_0j20ptTBSlE3184HZE/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9pbWdz/LnNlYXJjaC5icmF2/ZS5jb20vMTRROE01/WjhkdHpGbUZxVi1Y/d1I5M3M1LVA5SlBW/RHBwWmtEc1Z5UkZf/TS9yczpmaXQ6NTYw/OjMyMDoxOjAvZzpj/ZS9hSFIwY0hNNkx5/OWpaRzR1L2MyaHZj/R2xtZVM1amIyMHYv/Y3k5bWFXeGxjeTh4/THpBdy9OekF2TnpB/ek1pOWhjblJwL1ky/eGxjeTl0YjNScGRt/RjAvYVc5dVlXeGZN/akJ4ZFc5MC9aWE5m/WmpSallXTTVOR010/L1pXWTFaQzAwWkRG/a0xUbGwvWkdZdE1U/SmlOREE1TnpWay9a/R1EwTG5CdVp6OTJQ/VEUzL01qa3lOemcx/TWpVbWIzSnAvWjJs/dVlXeFhhV1IwYUQw/eC9PRFE0Sm05eWFX/ZHBibUZzL1NHVnBa/MmgwUFRjNE1n.jpeg', label: 'Motivational Quotes' },
  { id: '2', image: 'https://imgs.search.brave.com/QS7NoATo7Ox7h8HzSYMvN-A6_0j20ptTBSlE3184HZE/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9pbWdz/LnNlYXJjaC5icmF2/ZS5jb20vMTRROE01/WjhkdHpGbUZxVi1Y/d1I5M3M1LVA5SlBW/RHBwWmtEc1Z5UkZf/TS9yczpmaXQ6NTYw/OjMyMDoxOjAvZzpj/ZS9hSFIwY0hNNkx5/OWpaRzR1L2MyaHZj/R2xtZVM1amIyMHYv/Y3k5bWFXeGxjeTh4/THpBdy9OekF2TnpB/ek1pOWhjblJwL1ky/eGxjeTl0YjNScGRt/RjAvYVc5dVlXeGZN/akJ4ZFc5MC9aWE5m/WmpSallXTTVOR010/L1pXWTFaQzAwWkRG/a0xUbGwvWkdZdE1U/SmlOREE1TnpWay9a/R1EwTG5CdVp6OTJQ/VEUzL01qa3lOemcx/TWpVbWIzSnAvWjJs/dVlXeFhhV1IwYUQw/eC9PRFE0Sm05eWFX/ZHBibUZzL1NHVnBa/MmgwUFRjNE1n.jpeg', label: 'College Details' },
  { id: '3', image: 'https://imgs.search.brave.com/QS7NoATo7Ox7h8HzSYMvN-A6_0j20ptTBSlE3184HZE/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9pbWdz/LnNlYXJjaC5icmF2/ZS5jb20vMTRROE01/WjhkdHpGbUZxVi1Y/d1I5M3M1LVA5SlBW/RHBwWmtEc1Z5UkZf/TS9yczpmaXQ6NTYw/OjMyMDoxOjAvZzpj/ZS9hSFIwY0hNNkx5/OWpaRzR1L2MyaHZj/R2xtZVM1amIyMHYv/Y3k5bWFXeGxjeTh4/THpBdy9OekF2TnpB/ek1pOWhjblJwL1ky/eGxjeTl0YjNScGRt/RjAvYVc5dVlXeGZN/akJ4ZFc5MC9aWE5m/WmpSallXTTVOR010/L1pXWTFaQzAwWkRG/a0xUbGwvWkdZdE1U/SmlOREE1TnpWay9a/R1EwTG5CdVp6OTJQ/VEUzL01qa3lOemcx/TWpVbWIzSnAvWjJs/dVlXeFhhV1IwYUQw/eC9PRFE0Sm05eWFX/ZHBibUZzL1NHVnBa/MmgwUFRjNE1n.jpeg', label: 'Course Details' },
  { id: '4', image: 'https://imgs.search.brave.com/QS7NoATo7Ox7h8HzSYMvN-A6_0j20ptTBSlE3184HZE/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9pbWdz/LnNlYXJjaC5icmF2/ZS5jb20vMTRROE01/WjhkdHpGbUZxVi1Y/d1I5M3M1LVA5SlBW/RHBwWmtEc1Z5UkZf/TS9yczpmaXQ6NTYw/OjMyMDoxOjAvZzpj/ZS9hSFIwY0hNNkx5/OWpaRzR1L2MyaHZj/R2xtZVM1amIyMHYv/Y3k5bWFXeGxjeTh4/THpBdy9OekF2TnpB/ek1pOWhjblJwL1ky/eGxjeTl0YjNScGRt/RjAvYVc5dVlXeGZN/akJ4ZFc5MC9aWE5m/WmpSallXTTVOR010/L1pXWTFaQzAwWkRG/a0xUbGwvWkdZdE1U/SmlOREE1TnpWay9a/R1EwTG5CdVp6OTJQ/VEUzL01qa3lOemcx/TWpVbWIzSnAvWjJs/dVlXeFhhV1IwYUQw/eC9PRFE0Sm05eWFX/ZHBibUZzL1NHVnBa/MmgwUFRjNE1n.jpeg', label: 'Job Opening' },
  { id: '5', image: 'https://imgs.search.brave.com/QS7NoATo7Ox7h8HzSYMvN-A6_0j20ptTBSlE3184HZE/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9pbWdz/LnNlYXJjaC5icmF2/ZS5jb20vMTRROE01/WjhkdHpGbUZxVi1Y/d1I5M3M1LVA5SlBW/RHBwWmtEc1Z5UkZf/TS9yczpmaXQ6NTYw/OjMyMDoxOjAvZzpj/ZS9hSFIwY0hNNkx5/OWpaRzR1L2MyaHZj/R2xtZVM1amIyMHYv/Y3k5bWFXeGxjeTh4/THpBdy9OekF2TnpB/ek1pOWhjblJwL1ky/eGxjeTl0YjNScGRt/RjAvYVc5dVlXeGZN/akJ4ZFc5MC9aWE5m/WmpSallXTTVOR010/L1pXWTFaQzAwWkRG/a0xUbGwvWkdZdE1U/SmlOREE1TnpWay9a/R1EwTG5CdVp6OTJQ/VEUzL01qa3lOemcx/TWpVbWIzSnAvWjJs/dVlXeFhhV1IwYUQw/eC9PRFE0Sm05eWFX/ZHBibUZzL1NHVnBa/MmgwUFRjNE1n.jpeg', label: 'Course Benifits' },
];

// Function to seed the database
const seedDatabase = async () => {
  try {
    // Clear existing data
    await Icon.deleteMany({});
    console.log('Existing icons cleared');
    
    // Insert new data
    await Icon.insertMany(initialIcons);
    console.log('Successfully seeded icons');
    
    // Disconnect from MongoDB
    mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.disconnect();
  }
};

// Run the seeding function
seedDatabase();