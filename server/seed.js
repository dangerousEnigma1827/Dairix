import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/userModels.js';
import Product from './models/productModels.js';
import Dispatch from './models/dispatchModels.js';
import DeliveryEntry from './models/deliveryEntryModels.js';

// Products catalogue
const DUMMY_PRODUCTS = [
  {
    name: "Cow Milk (A2 Fresh)",
    price: 75,
    unit: "1L",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Buffalo Milk (Full Cream)",
    price: 80,
    unit: "1L",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Toned Milk",
    price: 54,
    unit: "1L",
    image: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Double Toned Milk",
    price: 48,
    unit: "1L",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Fresh Cow Milk (500ml)",
    price: 38,
    unit: "500ml",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Fresh Buffalo Milk (500ml)",
    price: 42,
    unit: "500ml",
    image: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Desi Cow Ghee",
    price: 650,
    unit: "500ml",
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Farm Fresh Paneer",
    price: 120,
    unit: "250g",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Malai Paneer",
    price: 220,
    unit: "500g",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Masala Chaas / Buttermilk",
    price: 25,
    unit: "500ml",
    image: "https://images.unsplash.com/photo-1517438322307-e67111335449?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Sweet Mango Lassi",
    price: 35,
    unit: "300ml",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Traditional White Butter (Makhan)",
    price: 140,
    unit: "250g",
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80"
  }
];

// 18 Delivery Staff
const DUMMY_DMS = [
  { name: "Ramesh Kumar", mobile: "9820010001", city: "Bengaluru", pincode: "560034", street: "100ft Road, Koramangala", landmark: "Near Sony Signal" },
  { name: "Suresh Sharma", mobile: "9820010002", city: "Bengaluru", pincode: "560102", street: "27th Main, HSR Layout", landmark: "Near BDA Complex" },
  { name: "Vikram Singh", mobile: "9820010003", city: "Bengaluru", pincode: "560066", street: "ITPL Main Road, Whitefield", landmark: "Opposite Forum Mall" },
  { name: "Rajesh Patel", mobile: "9820010004", city: "Bengaluru", pincode: "560038", street: "12th Main, Indiranagar", landmark: "Near Metro Station" },
  { name: "Manoj Verma", mobile: "9820010005", city: "Bengaluru", pincode: "560035", street: "Sarjapur Main Road", landmark: "Near Wipro Corporate Office" },
  { name: "Amit Yadav", mobile: "9820010006", city: "Bengaluru", pincode: "560076", street: "Bannerghatta Main Road", landmark: "Near Meenakshi Mall" },
  { name: "Deepak Joshi", mobile: "9820010007", city: "Bengaluru", pincode: "560043", street: "Kammanahalli Main Road", landmark: "Near Jal Vayu Vihar" },
  { name: "Rahul Gupta", mobile: "9820010008", city: "Mumbai", pincode: "400076", street: "Hiranandani Gardens, Powai", landmark: "Near Galleria Shopping Mall" },
  { name: "Sunil Rathore", mobile: "9820010009", city: "Mumbai", pincode: "400050", street: "Hill Road, Bandra West", landmark: "Opposite Mehboob Studio" },
  { name: "Anil Chauhan", mobile: "9820010010", city: "Mumbai", pincode: "400053", street: "Lokhandwala Complex, Andheri West", landmark: "Near Celebration Club" },
  { name: "Mukesh Rawat", mobile: "9820010011", city: "Pune", pincode: "411038", street: "Paud Road, Kothrud", landmark: "Near Vanaz Metro Station" },
  { name: "Pradeep Tiwari", mobile: "9820010012", city: "Pune", pincode: "411057", street: "Phase 1 Road, Hinjawadi", landmark: "Near Infosys Circle" },
  { name: "Sanjay Soni", mobile: "9820010013", city: "Hyderabad", pincode: "500032", street: "Gachibowli Main Road", landmark: "Near DLF Cybercity" },
  { name: "Rakesh Meena", mobile: "9820010014", city: "Hyderabad", pincode: "500081", street: "Hitec City Phase 2", landmark: "Opposite Inorbit Mall" },
  { name: "Dinesh Prajapat", mobile: "9820010015", city: "Delhi NCR", pincode: "110017", street: "Shivalik Road, Malviya Nagar", landmark: "Near Geetanjali Enclave" },
  { name: "Ajay Nair", mobile: "9820010016", city: "Delhi NCR", pincode: "201301", street: "Sector 62, Noida", landmark: "Near Electronic City Metro" },
  { name: "Gopal Das", mobile: "9820010017", city: "Jaipur", pincode: "302017", street: "Calgiri Road, Malviya Nagar", landmark: "Near Apex Hospital" },
  { name: "Harish Mishra", mobile: "9820010018", city: "Jaipur", pincode: "302020", street: "Queens Road, Vaishali Nagar", landmark: "Near National Handloom" }
];

// 60 Customers
const DUMMY_CUSTOMERS = [
  { name: "Aarav Sharma", mobile: "9810010001", houseNo: "Flat 402, Block A", street: "Green Glen Layout", landmark: "Near Apollo Pharmacy", city: "Bengaluru", pincode: "560103", latitude: 12.9298, longitude: 77.6743, notes: "Leave milk in basket on door hook" },
  { name: "Priya Patel", mobile: "9810010002", houseNo: "Villa 12, Palm Meadows", street: "Airport Road, Varthur", landmark: "Opposite Sigma Tech Park", city: "Bengaluru", pincode: "560066", latitude: 12.9567, longitude: 77.7410, notes: "Ring doorbell once gently before 6:30 AM" },
  { name: "Rohan Mehta", mobile: "9810010003", houseNo: "House 54, 4th Cross", street: "Koramangala 4th Block", landmark: "Behind BDA Park", city: "Bengaluru", pincode: "560034", latitude: 12.9344, longitude: 77.6256, notes: "Keep in cooler bag by door" },
  { name: "Ananya Gupta", mobile: "9810010004", houseNo: "B-304, Sun City Apts", street: "Sarjapur Outer Ring Road", landmark: "Near Bellandur Flyover", city: "Bengaluru", pincode: "560102", latitude: 12.9352, longitude: 77.6821, notes: "Leave outside flat door, do not ring" },
  { name: "Siddharth Verma", mobile: "9810010005", houseNo: "Penthouse 1102", street: "12th Main, Indiranagar", landmark: "Next to Cafe Coffee Day", city: "Bengaluru", pincode: "560038", latitude: 12.9784, longitude: 77.6408, notes: "Security guard has lift access key" },
  { name: "Neha Reddy", mobile: "9810010006", houseNo: "Flat 201, Orchid Enclave", street: "HSR Layout Sector 1", landmark: "Near Agara Lake View", city: "Bengaluru", pincode: "560102", latitude: 12.9116, longitude: 77.6389, notes: "Drop milk packet in porch basket" },
  { name: "Aditya Joshi", mobile: "9810010007", houseNo: "B-14, Shanti Niketan", street: "Bannerghatta Main Road", landmark: "Opposite Fortis Hospital", city: "Bengaluru", pincode: "560076", latitude: 12.8942, longitude: 77.5991, notes: "Morning drop between 6:00 AM - 7:00 AM" },
  { name: "Kavita Iyer", mobile: "9810010008", houseNo: "Flat 503, Tower C", street: "Prestige Shantiniketan", landmark: "Near Hoodi Metro Station", city: "Bengaluru", pincode: "560048", latitude: 12.9892, longitude: 77.7281, notes: "Deliver to door. Bell is working." },
  { name: "Rahul Malhotra", mobile: "9810010009", houseNo: "C-22, Defence Colony", street: "HAL 2nd Stage", landmark: "Near Leela Palace", city: "Bengaluru", pincode: "560008", latitude: 12.9647, longitude: 77.6534, notes: "Leave milk packet on porch table" },
  { name: "Pooja Nair", mobile: "9810010010", houseNo: "Plot 89, 7th Main", street: "BTM 2nd Stage", landmark: "Near Udupi Garden Signal", city: "Bengaluru", pincode: "560076", latitude: 12.9166, longitude: 77.6101, notes: "Please do not ring bell (baby asleep)" },
  { name: "Kunal Bansal", mobile: "9810010011", houseNo: "Flat 604, Tower 3", street: "Brigade Gateway, Rajajinagar", landmark: "Near Orion Mall", city: "Bengaluru", pincode: "560055", latitude: 13.0125, longitude: 77.5554, notes: "Leave with security reception if before 6 AM" },
  { name: "Shweta Deshmukh", mobile: "9810010012", houseNo: "Flat 101, Lotus Heights", street: "Kasturi Nagar Main Road", landmark: "Near East Point Hospital", city: "Bengaluru", pincode: "560043", latitude: 13.0031, longitude: 77.6575, notes: "Hang bag on door handle" },
  { name: "Arjun Kulkarni", mobile: "9810010013", houseNo: "Villa 45, Sobha City", street: "Thanisandra Main Road", landmark: "Near Manyata Tech Park", city: "Bengaluru", pincode: "560077", latitude: 13.0543, longitude: 77.6322, notes: "Leave inside milk box" },
  { name: "Divya Saxena", mobile: "9810010014", houseNo: "Flat 801, Wing B", street: "Central Avenue, Powai", landmark: "Opposite Hakone Entertainment", city: "Mumbai", pincode: "400076", latitude: 19.1176, longitude: 72.9060, notes: "Security gate entry code 7781" },
  { name: "Rohit Choudhary", mobile: "9810010015", houseNo: "Flat 302, Sea Pearl", street: "Carter Road, Bandra West", landmark: "Near Cafe Coffee Day Promenade", city: "Mumbai", pincode: "400050", latitude: 19.0657, longitude: 72.8272, notes: "Leave at door step" },
  { name: "Tanvi Bhatia", mobile: "9810010016", houseNo: "Flat 505, Royal Palms", street: "Aarey Colony, Goregaon East", landmark: "Near Royal Palms Golf Course", city: "Mumbai", pincode: "400065", latitude: 19.1553, longitude: 72.8845, notes: "Keep in chilled delivery box" },
  { name: "Vivek Sengupta", mobile: "9810010017", houseNo: "Flat 202, Silver Crest", street: "Lokhandwala Market Road", landmark: "Near High Point Restaurant", city: "Mumbai", pincode: "400053", latitude: 19.1415, longitude: 72.8267, notes: "Ring bell once" },
  { name: "Sneha Kulkarni", mobile: "9810010018", houseNo: "Flat 701, Emerald Isle", street: "Saki Vihar Road, Powai", landmark: "Near L&T Infotech Gate 5", city: "Mumbai", pincode: "400072", latitude: 19.1128, longitude: 72.8887, notes: "Early morning drop preferred" },
  { name: "Nikhil Aggarwal", mobile: "9810010019", houseNo: "House 18, 14th Road", street: "Khar West", landmark: "Near Khar Gymkhana", city: "Mumbai", pincode: "400052", latitude: 19.0700, longitude: 72.8339, notes: "Deliver on porch" },
  { name: "Ritu Singhania", mobile: "9810010020", houseNo: "Flat 1204, Lodha Bellissimo", street: "NM Joshi Marg, Mahalaxmi", landmark: "Near Currey Road Station", city: "Mumbai", pincode: "400011", latitude: 18.9950, longitude: 72.8258, notes: "Service lift delivery to door" },
  { name: "Abhishek Rao", mobile: "9810010021", houseNo: "B-201, Pristine Magna", street: "Wakad-Hinjawadi Link Road", landmark: "Near D-Mart Wakad", city: "Pune", pincode: "411057", latitude: 18.5987, longitude: 73.7621, notes: "Leave in red milk pouch" },
  { name: "Meera Nambiar", mobile: "9810010022", houseNo: "Row House 7", street: "Mayur Colony, Kothrud", landmark: "Near Joggers Park", city: "Pune", pincode: "411038", latitude: 18.5074, longitude: 73.8077, notes: "Keep on milk stool by door" },
  { name: "Varun Pillai", mobile: "9810010023", houseNo: "Flat 403, Blue Ridge", street: "Phase 1, Hinjawadi", landmark: "Near Cognizant Campus", city: "Pune", pincode: "411057", latitude: 18.5831, longitude: 73.7380, notes: "Deliver before 6:45 AM" },
  { name: "Swati Mukherjee", mobile: "9810010024", houseNo: "Flat 102, Kumar Sublime", street: "Kalyani Nagar Main Road", landmark: "Near Joggers Park Gate 2", city: "Pune", pincode: "411006", latitude: 18.5482, longitude: 73.9022, notes: "Doorbell ring requested" },
  { name: "Gaurav Chawla", mobile: "9810010025", houseNo: "Villa 32, Nyati Estate", street: "Mohammed Wadi", landmark: "Near DPS School", city: "Pune", pincode: "411060", latitude: 18.4735, longitude: 73.9142, notes: "Gate latch is on right side" },
  { name: "Ishita Sen", mobile: "9810010026", houseNo: "Flat 904, Aparna Sarovar", street: "Nallagandla Main Road", landmark: "Near Citizen Hospital", city: "Hyderabad", pincode: "500019", latitude: 17.4721, longitude: 78.3142, notes: "Leave on entrance mat" },
  { name: "Harish Venkatesh", mobile: "9810010027", houseNo: "Plot 14, Road No 12", street: "Banjara Hills", landmark: "Near MLA Colony", city: "Hyderabad", pincode: "500034", latitude: 17.4156, longitude: 78.4350, notes: "Security guard will collect" },
  { name: "Riya Kapoor", mobile: "9810010028", houseNo: "Flat 303, My Home Bhooja", street: "Knowledge City, Hitec City", landmark: "Near IKEA Store", city: "Hyderabad", pincode: "500081", latitude: 17.4375, longitude: 78.3812, notes: "Door delivery via tower lift" },
  { name: "Manish Jain", mobile: "9810010029", houseNo: "House 28, Telecom Nagar", street: "Gachibowli", landmark: "Near Urdu University", city: "Hyderabad", pincode: "500032", latitude: 17.4401, longitude: 78.3489, notes: "Leave milk packet on table" },
  { name: "Pallavi Hegde", mobile: "9810010030", houseNo: "Flat 602, Jayabheri Silicon", street: "Kondapur Main Road", landmark: "Opposite Botanical Garden", city: "Hyderabad", pincode: "500084", latitude: 17.4648, longitude: 78.3615, notes: "Deliver between 6-7 AM" },
  { name: "Sandeep Tiwari", mobile: "9810010031", houseNo: "House 82, Block B", street: "Sector 14, Noida", landmark: "Near Noida Stadium", city: "Delhi NCR", pincode: "201301", latitude: 28.5833, longitude: 77.3150, notes: "Drop inside gate milk box" },
  { name: "Sunita Menon", mobile: "9810010032", houseNo: "Flat 401, ATS Greens", street: "Sector 93A, Noida Expressway", landmark: "Near Geeta Bhawan", city: "Delhi NCR", pincode: "201304", latitude: 28.5152, longitude: 77.3821, notes: "Please ring twice" },
  { name: "Tarun Bhatt", mobile: "9810010033", houseNo: "A-45, Hauz Khas Enclave", street: "Aurobindo Marg", landmark: "Near Hauz Khas Metro", city: "Delhi NCR", pincode: "110016", latitude: 28.5494, longitude: 77.2001, notes: "Hand over to cook if awake" },
  { name: "Deepa Subramanian", mobile: "9810010034", houseNo: "C-12, Vasant Vihar", street: "Paschimi Marg", landmark: "Near Priya Cinema Market", city: "Delhi NCR", pincode: "110057", latitude: 28.5603, longitude: 77.1611, notes: "Keep in thermal box" },
  { name: "Alok Pandey", mobile: "9810010035", houseNo: "House 104, Sector 23", street: "Palam Vihar Road", landmark: "Near Columbia Asia Hospital", city: "Delhi NCR", pincode: "122017", latitude: 28.5085, longitude: 77.0315, notes: "Drop in morning delivery tray" },
  { name: "Preeti Goel", mobile: "9810010036", houseNo: "Villa 10, Nirvana Country", street: "Sector 50, Gurgaon", landmark: "Opposite Baani Square", city: "Delhi NCR", pincode: "122018", latitude: 28.4172, longitude: 77.0674, notes: "Doorbell only if after 7 AM" },
  { name: "Mayank Trivedi", mobile: "9810010037", houseNo: "Flat 301, Coral Castle", street: "Subhash Marg, C-Scheme", landmark: "Near Statue Circle", city: "Jaipur", pincode: "302001", latitude: 26.9075, longitude: 75.8021, notes: "Deliver to 3rd floor flat" },
  { name: "Rashmi Kaushik", mobile: "9810010038", houseNo: "House 24, Sector 7", street: "Malviya Nagar", landmark: "Near Gaurav Tower", city: "Jaipur", pincode: "302017", latitude: 26.8542, longitude: 75.8234, notes: "Leave milk in side bag" },
  { name: "Mohit Anand", mobile: "9810010039", houseNo: "B-18, Vaishali Marg", street: "Vaishali Nagar", landmark: "Near Amrapali Circle", city: "Jaipur", pincode: "302021", latitude: 26.9028, longitude: 75.7410, notes: "Leave outside main door" },
  { name: "Shalini Mittal", mobile: "9810010040", houseNo: "Plot 67, Tilak Nagar", street: "Raja Park Main Road", landmark: "Near LBS College", city: "Jaipur", pincode: "302004", latitude: 26.8925, longitude: 75.8312, notes: "Morning drop before 6:30 AM" },
  { name: "Karan Varma", mobile: "9810010041", houseNo: "Flat 102, Suncity Glorious", street: "Koramangala 1st Block", landmark: "Near Wipro Park", city: "Bengaluru", pincode: "560034", latitude: 12.9279, longitude: 77.6271, notes: "Leave at door" },
  { name: "Sangeeta Ghosh", mobile: "9810010042", houseNo: "House 312, 17th Cross", street: "HSR Layout Sector 4", landmark: "Near BDA Park", city: "Bengaluru", pincode: "560102", latitude: 12.9102, longitude: 77.6450, notes: "Drop in porch basket" },
  { name: "Naveen Prasad", mobile: "9810010043", houseNo: "Flat 504, Tower B", street: "Godrej United, Whitefield", landmark: "Near Mahadevapura Ring Road", city: "Bengaluru", pincode: "560048", latitude: 12.9915, longitude: 77.7125, notes: "Deliver to door" },
  { name: "Rekha Pillai", mobile: "9810010044", houseNo: "Villa 19, Adarsh Palm Retreat", street: "Outer Ring Road, Bellandur", landmark: "Near Devarabisanahalli", city: "Bengaluru", pincode: "560103", latitude: 12.9234, longitude: 77.6854, notes: "Drop in cooler bag" },
  { name: "Hemant Bajaj", mobile: "9810010045", houseNo: "B-403, Salarpuria Greenage", street: "Hosur Road, Bommanahalli", landmark: "Near Oxford College", city: "Bengaluru", pincode: "560068", latitude: 12.9056, longitude: 77.6250, notes: "Leave milk packet on door hook" },
  // Customers without coordinates (for testing missing-coordinate and unmapped handling)
  { name: "Ankita Mathur", mobile: "9810010046", houseNo: "Flat 204, Oberoi Springs", street: "Link Road, Andheri West", landmark: "Near Fame Adlabs", city: "Mumbai", pincode: "400053", notes: "Security allows entry at 6 AM" },
  { name: "Deepak Sethi", mobile: "9810010047", houseNo: "B-32, Sea Face Park", street: "Bhulabhai Desai Road", landmark: "Near Breach Candy Hospital", city: "Mumbai", pincode: "400026", notes: "Ring doorbell once" },
  { name: "Aarti Agnihotri", mobile: "9810010048", houseNo: "Flat 702, Raheja Vistas", street: "Chandivali Farm Road", landmark: "Near Nahar Medical Centre", city: "Mumbai", pincode: "400072", notes: "Leave outside flat door" },
  { name: "Sumit Mathur", mobile: "9810010049", houseNo: "Flat 1101, Rohan Mithila", street: "Viman Nagar Road", landmark: "Near Phoenix Marketcity", city: "Pune", pincode: "411014", notes: "Deliver before 6:30 AM" },
  { name: "Vandana Pillai", mobile: "9810010050", houseNo: "Row House 15", street: "Aundh Main Road", landmark: "Near Bremen Square", city: "Pune", pincode: "411007", notes: "Keep in thermal bag" },
  { name: "Rajeev Bhatnagar", mobile: "9810010051", houseNo: "Flat 802, Lanco Hills", street: "Manikonda", landmark: "Near Lanco Club", city: "Hyderabad", pincode: "500089", notes: "Leave at door" },
  { name: "Madhavi Rao", mobile: "9810010052", houseNo: "House 41, Jubilee Hills", street: "Road No 36", landmark: "Near Peddamma Temple", city: "Hyderabad", pincode: "500033", notes: "Leave in gate milk basket" },
  { name: "Chetan Chauhan", mobile: "9810010053", houseNo: "House 19, Sector 21D", street: "Faridabad Main Road", landmark: "Near DPS Faridabad", city: "Delhi NCR", pincode: "121001", notes: "Morning drop before 7 AM" },
  { name: "Shruti Mishra", mobile: "9810010054", houseNo: "Flat 304, Palm Court", street: "Sector 19A, Nerul", landmark: "Near Wonders Park", city: "Mumbai", pincode: "400706", notes: "Leave milk packet on hook" },
  { name: "Pankaj Dubey", mobile: "9810010055", houseNo: "Flat 102, Royal Palms", street: "Koregaon Park North Main Road", landmark: "Near German Bakery", city: "Pune", pincode: "411001", notes: "Deliver by 6:15 AM" },
  // Unassigned Customers (for testing unassigned filters in Owner Customer Dashboard)
  { name: "Neelam Shrivastava", mobile: "9810010056", houseNo: "House 67, Scheme 54", street: "Vijay Nagar", landmark: "Near Meghdoot Garden", city: "Indore", pincode: "452010", notes: "Awaiting delivery partner assignment" },
  { name: "Ashish Rawal", mobile: "9810010057", houseNo: "Flat 202, Surya Enclave", street: "Race Course Road", landmark: "Near Yeshwant Club", city: "Indore", pincode: "452001", notes: "New customer - unassigned" },
  { name: "Simran Seth", mobile: "9810010058", houseNo: "Villa 8, Silver Springs", street: "Bypass Road", landmark: "Near Best Price", city: "Indore", pincode: "452016", notes: "Newly registered customer" },
  { name: "Saurabh Saxena", mobile: "9810010059", houseNo: "Flat 401, Sapphire Heights", street: "AB Road", landmark: "Near C21 Mall", city: "Indore", pincode: "452010", notes: "Please assign morning route delivery staff" },
  { name: "Bhavna Grover", mobile: "9810010060", houseNo: "House 112, Saket Nagar", street: "Old Palasia", landmark: "Near Saket Garden", city: "Indore", pincode: "452018", notes: "Unassigned customer" }
];

async function seed() {
  console.log("=== Dairix Comprehensive Seed Script ===");
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("Error: MONGO_URI is missing in environment variables.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.\n");

  // Common password hash for '1'
  const passwordHash = await bcrypt.hash("1", 10);

  // 1. Seed / Upsert Products
  console.log("--- 1. Seeding Products ---");
  const productsMap = new Map();

  // Load existing products first
  const existingProducts = await Product.find();
  for (const p of existingProducts) {
    productsMap.set(p.name.toLowerCase(), p);
    console.log(`  [Existing Product] ${p.name} (₹${p.price}/${p.unit})`);
  }

  // Insert dummy products if not present
  for (const item of DUMMY_PRODUCTS) {
    if (!productsMap.has(item.name.toLowerCase())) {
      const created = await Product.create(item);
      productsMap.set(created.name.toLowerCase(), created);
      console.log(`  [Created Product] ${created.name} (₹${created.price}/${created.unit})`);
    }
  }

  const allProducts = Array.from(productsMap.values());
  console.log(`Total Products Available: ${allProducts.length}\n`);

  // 2. Seed / Upsert Delivery Men (DMs)
  console.log("--- 2. Seeding Delivery Men ---");
  const seededDMs = [];

  for (const dmInfo of DUMMY_DMS) {
    let dm = await User.findOne({ mobile: dmInfo.mobile });
    if (!dm) {
      dm = await User.create({
        name: dmInfo.name,
        mobile: dmInfo.mobile,
        password: passwordHash,
        role: "dm",
        address: {
          houseNo: "Staff Qtrs",
          street: dmInfo.street,
          landmark: dmInfo.landmark,
          city: dmInfo.city,
          pincode: dmInfo.pincode
        },
        deliveryNotes: "Active Field Partner",
        qrCode: `DM-QR-${dmInfo.mobile}`,
        products: []
      });
      console.log(`  [Created DM] ${dm.name} (${dm.mobile}) in ${dmInfo.city}`);
    } else {
      // Ensure password is hash of "1" and role is "dm"
      dm.role = "dm";
      dm.password = passwordHash;
      await dm.save();
      console.log(`  [Existing DM Synced] ${dm.name} (${dm.mobile})`);
    }
    seededDMs.push(dm);
  }
  console.log(`Total Seeded DMs: ${seededDMs.length}\n`);

  // 3. Seed / Upsert Customers
  console.log("--- 3. Seeding Customers ---");
  const seededCustomers = [];

  // Helper to get random subset of products for customer subscription
  const getRandomSubscriptions = (index) => {
    // Pick 1 to 3 products deterministically based on index for repeatability
    const subs = [];
    const p1 = allProducts[index % allProducts.length];
    subs.push({
      _id: String(p1._id),
      name: p1.name,
      price: p1.price,
      unit: p1.unit,
      image: p1.image,
      quantity: (index % 3 === 0) ? 2 : 1
    });

    if (index % 2 === 0) {
      const p2 = allProducts[(index + 3) % allProducts.length];
      if (String(p2._id) !== String(p1._id)) {
        subs.push({
          _id: String(p2._id),
          name: p2.name,
          price: p2.price,
          unit: p2.unit,
          image: p2.image,
          quantity: 1
        });
      }
    }

    if (index % 5 === 0) {
      const p3 = allProducts[(index + 6) % allProducts.length];
      if (String(p3._id) !== String(p1._id)) {
        subs.push({
          _id: String(p3._id),
          name: p3.name,
          price: p3.price,
          unit: p3.unit,
          image: p3.image,
          quantity: 0.5
        });
      }
    }

    return subs;
  };

  for (let i = 0; i < DUMMY_CUSTOMERS.length; i++) {
    const custInfo = DUMMY_CUSTOMERS[i];
    // Assign to a DM if i < 55, leave 55..59 unassigned for testing
    const assignedDmId = (i < 55 && seededDMs.length > 0)
      ? seededDMs[i % seededDMs.length]._id
      : null;

    let cust = await User.findOne({ mobile: custInfo.mobile });
    const customerSubs = getRandomSubscriptions(i);

    if (!cust) {
      cust = await User.create({
        name: custInfo.name,
        mobile: custInfo.mobile,
        password: passwordHash,
        role: "customer",
        address: {
          houseNo: custInfo.houseNo,
          street: custInfo.street,
          landmark: custInfo.landmark,
          city: custInfo.city,
          pincode: custInfo.pincode,
          latitude: custInfo.latitude || null,
          longitude: custInfo.longitude || null,
        },
        location: custInfo.latitude && custInfo.longitude ? {
          latitude: custInfo.latitude,
          longitude: custInfo.longitude,
        } : undefined,
        latitude: custInfo.latitude || null,
        longitude: custInfo.longitude || null,
        deliveryNotes: custInfo.notes,
        assignedDm: assignedDmId,
        qrCode: `CUST-QR-${custInfo.mobile}`,
        products: customerSubs
      });
      console.log(`  [Created Customer] ${cust.name} (${cust.mobile}) -> ${assignedDmId ? 'Assigned' : 'Unassigned'} [Coords: ${custInfo.latitude ? 'Yes' : 'No'}]`);
    } else {
      cust.role = "customer";
      cust.password = passwordHash;
      cust.assignedDm = assignedDmId;
      cust.products = customerSubs;
      if (custInfo.latitude && custInfo.longitude) {
        if (!cust.address) cust.address = {};
        cust.address.latitude = custInfo.latitude;
        cust.address.longitude = custInfo.longitude;
        cust.location = { latitude: custInfo.latitude, longitude: custInfo.longitude };
        cust.latitude = custInfo.latitude;
        cust.longitude = custInfo.longitude;
      }
      await cust.save();
      console.log(`  [Existing Customer Synced] ${cust.name} (${cust.mobile}) [Coords: ${custInfo.latitude ? 'Yes' : 'No'}]`);
    }
    seededCustomers.push(cust);
  }
  console.log(`Total Seeded Customers: ${seededCustomers.length}\n`);

  // 4. Seed Dispatches & Delivery Entries for Today and Past 14 Days
  console.log("--- 4. Seeding Dispatches & Delivery Entries ---");
  const assignedCustomers = seededCustomers.filter(c => c.assignedDm && c.products && c.products.length > 0);
  console.log(`Customers with assigned DM and active subscriptions: ${assignedCustomers.length}`);

  let createdDispatchesCount = 0;
  let createdDeliveriesCount = 0;

  // We seed from Day -14 to Day 0 (today)
  const now = new Date();

  for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - dayOffset);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if a dispatch already exists for this date
    let dispatch = await Dispatch.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const isToday = (dayOffset === 0);

    if (!dispatch) {
      // Build DM allocation blocks
      const dmDeliveriesMap = new Map();

      for (const customer of assignedCustomers) {
        const dmIdStr = customer.assignedDm.toString();
        if (!dmDeliveriesMap.has(dmIdStr)) {
          dmDeliveriesMap.set(dmIdStr, {
            dm: customer.assignedDm,
            allocationsMap: new Map(),
            status: isToday ? "assigned" : "completed"
          });
        }

        const dmBlock = dmDeliveriesMap.get(dmIdStr);
        for (const prod of customer.products) {
          const prodIdStr = prod._id.toString();
          const currQty = dmBlock.allocationsMap.get(prodIdStr) || 0;
          dmBlock.allocationsMap.set(prodIdStr, currQty + prod.quantity);
        }
      }

      const deliveriesArr = [];
      for (const [dmIdStr, data] of dmDeliveriesMap.entries()) {
        const allocations = [];
        for (const [pId, qty] of data.allocationsMap.entries()) {
          allocations.push({
            product: new mongoose.Types.ObjectId(pId),
            quantity: qty
          });
        }
        deliveriesArr.push({
          dm: data.dm,
          allocations,
          status: data.status
        });
      }

      // Exact timestamp for createdAt / updatedAt
      const dispatchTimestamp = new Date(targetDate);
      dispatchTimestamp.setHours(5, 30, 0, 0);

      dispatch = new Dispatch({
        date: dispatchTimestamp,
        deliveries: deliveriesArr,
        status: isToday ? "created" : "completed",
        createdAt: dispatchTimestamp,
        updatedAt: dispatchTimestamp
      });
      await dispatch.save();
      createdDispatchesCount++;

      // Create DeliveryEntries for each assigned customer
      for (let cIdx = 0; cIdx < assignedCustomers.length; cIdx++) {
        const customer = assignedCustomers[cIdx];
        let status = "delivered";
        let deliveredAtTime = null;

        if (isToday) {
          // Today: uncompleted deliveries must remain pending while delivery day is in progress (never prematurely skipped!)
          if (cIdx % 3 === 0) {
            status = "pending";
          } else {
            status = "delivered";
            deliveredAtTime = new Date(targetDate);
            deliveredAtTime.setHours(6 + (cIdx % 2), 15 + (cIdx * 3) % 45, 0, 0);
          }
        } else {
          // Past days: uncompleted deliveries after cutoff are skipped
          if (cIdx % 8 === 0) {
            status = "skipped";
          } else {
            status = "delivered";
            deliveredAtTime = new Date(targetDate);
            deliveredAtTime.setHours(6 + (cIdx % 2), 10 + (cIdx * 2) % 45, 0, 0);
          }
        }

        const entryProducts = customer.products.map(p => ({
          product: new mongoose.Types.ObjectId(p._id),
          quantity: p.quantity
        }));

        const entryTimestamp = new Date(targetDate);
        entryTimestamp.setHours(5, 45, 0, 0);

        const entry = new DeliveryEntry({
          dispatch: dispatch._id,
          date: entryTimestamp,
          customer: customer._id,
          dm: customer.assignedDm,
          products: entryProducts,
          status,
          deliveredAt: deliveredAtTime,
          createdAt: entryTimestamp,
          updatedAt: deliveredAtTime || entryTimestamp
        });
        await entry.save();
        createdDeliveriesCount++;
      }

      const dateStr = targetDate.toISOString().split("T")[0];
      console.log(`  [Dispatch Created] Date: ${dateStr} (${isToday ? 'TODAY' : 'PAST'}) -> ${deliveriesArr.length} DMs, ${assignedCustomers.length} deliveries`);
    } else {
      const dateStr = targetDate.toISOString().split("T")[0];
      console.log(`  [Dispatch Exists] Date: ${dateStr} - skipped duplicate creation.`);
    }
  }

  console.log(`\nDispatches Created in this run: ${createdDispatchesCount}`);
  console.log(`Delivery Entries Created in this run: ${createdDeliveriesCount}\n`);

  // Final verification counts
  const totalUsers = await User.countDocuments();
  const customerCount = await User.countDocuments({ role: "customer" });
  const dmCount = await User.countDocuments({ role: "dm" });
  const ownerCount = await User.countDocuments({ role: "owner" });
  const totalProductsCount = await Product.countDocuments();
  const totalDispatchesCount = await Dispatch.countDocuments();
  const totalDeliveryEntriesCount = await DeliveryEntry.countDocuments();

  console.log("=================================================");
  console.log("             FINAL DATABASE SUMMARY              ");
  console.log("=================================================");
  console.log(`Total Users:            ${totalUsers}`);
  console.log(`  - Customers:          ${customerCount}`);
  console.log(`  - Delivery Men (DMs): ${dmCount}`);
  console.log(`  - Owners:             ${ownerCount}`);
  console.log(`Total Products:         ${totalProductsCount}`);
  console.log(`Total Dispatches:       ${totalDispatchesCount}`);
  console.log(`Total Delivery Entries: ${totalDeliveryEntriesCount}`);
  console.log("=================================================");

  await mongoose.disconnect();
  console.log("MongoDB connection closed. Seeding complete!");
}

seed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});
