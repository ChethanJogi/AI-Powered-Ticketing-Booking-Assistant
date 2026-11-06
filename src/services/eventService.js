import { USE_MOCK, request, db, uid } from './apiClient.js';

export const CATEGORIES = ['Music', 'Comedy', 'Conference', 'Culture', 'College Technical', 'Workshop', 'Museum'];

export const TECH_EVENT_TYPES = [
  'All',
  'Hackathons',
  'Coding Competitions',
  'AI/ML Competitions',
  'Robotics Competitions',
  'Paper Presentations',
  'Project Exhibitions',
  'Technical Symposiums',
  'Cybersecurity Competitions',
  'Innovation Challenges',
];

export const WORKSHOP_TRACKS = [
  'All',
  'Programming',
  'AI & Machine Learning',
  'Cybersecurity',
  'Web Development',
  'Cloud Computing',
  'UI/UX Design',
  'Robotics',
  'Data Science',
];

export const MUSEUM_CATEGORIES = [
  'All',
  'Historical Museums',
  'Science Museums',
  'Art Galleries',
  'Technology Museums',
  'Cultural Heritage',
  'Special Exhibitions',
  'Educational Tours',
];

export const BRANCHES = [
  'All Branches',
  'Computer Science (CSE)',
  'Information Science (ISE)',
  'Electronics & Comm (ECE)',
  'Electrical & Electronics (EEE)',
  'Mechanical (MECH)',
  'Civil (CIVIL)',
  'AI & Data Science (AI/DS)',
];

const seed = [
  // Music, Comedy, Conference, Culture
  {
    id: 'ev_neon',
    title: 'Neon Nights Music Festival',
    category: 'Music',
    eventType: 'festival',
    date: '2026-12-12T18:00',
    venue: 'Palace Grounds',
    city: 'Bengaluru',
    description: 'A night of electronic and indie acts across three stages with immersive light shows.',
    price: 1499,
    capacity: 500,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 48 hours prior',
  },
  {
    id: 'ev_standup',
    title: 'Stand-Up Saturday',
    category: 'Comedy',
    eventType: 'standup',
    date: '2026-11-21T20:00',
    venue: 'Indiranagar Social',
    city: 'Bengaluru',
    description: 'Five comedians, one unforgettable evening of wit, satire, and stand-up comedy.',
    price: 599,
    capacity: 120,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free cancellation up to 24 hours prior',
  },
  {
    id: 'ev_startup',
    title: 'Startup Summit 2026',
    category: 'Conference',
    eventType: 'conference',
    date: '2027-01-15T09:30',
    venue: 'BIEC',
    city: 'Bengaluru',
    description: 'Founders, investors and builders under one roof discussing AI, venture capital, and deep tech.',
    price: 2499,
    capacity: 800,
    vendorId: 'u_vendor',
    certificateAvailable: true,
    cancellationPolicy: '50% refund up to 7 days prior',
  },
  {
    id: 'ev_classical',
    title: 'Classical Evenings',
    category: 'Culture',
    eventType: 'concert',
    date: '2026-11-29T19:00',
    venue: 'Chowdiah Memorial Hall',
    city: 'Bengaluru',
    description: 'An evening of Carnatic and Hindustani fusion celebrating classical Indian traditions.',
    price: 799,
    capacity: 300,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free cancellation up to 24 hours prior',
  },

  // FEATURE 1: College Technical Events
  {
    id: 'tech_hackindia',
    title: 'HackIndia 2026: 36h National Hackathon',
    category: 'College Technical',
    eventType: 'Hackathons',
    college: 'RV College of Engineering',
    branch: 'Computer Science (CSE)',
    date: '2026-11-28T09:00',
    venue: 'RVCE Campus, Mysore Road',
    city: 'Bengaluru',
    description: 'Premier 36-hour hackathon addressing real-world challenges in AI, Web3, and ClimateTech. Over ₹1,50,000 in prizes!',
    price: 0,
    capacity: 300,
    teamSize: '2-4 members',
    prizePool: '₹1,50,000',
    certificateAvailable: true,
    rulesUrl: 'https://hackindia.rvce.edu/rules',
    vendorId: 'u_organizer',
    cancellationPolicy: 'Free cancellation - immediately frees team slot',
  },
  {
    id: 'tech_bytecode',
    title: 'ByteCode: Competitive Coding Arena',
    category: 'College Technical',
    eventType: 'Coding Competitions',
    college: 'PES University',
    branch: 'Computer Science (CSE)',
    date: '2026-11-22T10:00',
    venue: 'PES University, Ring Road Campus',
    city: 'Bengaluru',
    description: 'High-intensity competitive programming duel in C++, Python, and Java. Dynamic programming, graph theory, and algorithmic speed.',
    price: 100,
    capacity: 150,
    teamSize: 'Individual',
    prizePool: '₹40,000',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Non-refundable registration fee',
  },
  {
    id: 'tech_neurohack',
    title: 'NeuroHack: Deep Learning Challenge',
    category: 'College Technical',
    eventType: 'AI/ML Competitions',
    college: 'IISc Bengaluru',
    branch: 'AI & Data Science (AI/DS)',
    date: '2026-12-05T09:30',
    venue: 'IISc Department of Computer Science',
    city: 'Bengaluru',
    description: 'Solve challenging computer vision and LLM benchmark problems evaluated live on hidden test datasets. Compute clusters provided.',
    price: 0,
    capacity: 120,
    teamSize: '1-3 members',
    prizePool: '₹75,000 + Internship Interview',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Free registration - please cancel 24h prior if unable to attend',
  },
  {
    id: 'tech_robowars',
    title: 'RoboWars & Maze Solver 2026',
    category: 'College Technical',
    eventType: 'Robotics Competitions',
    college: 'IIT Bombay',
    branch: 'Mechanical (MECH)',
    date: '2026-12-18T10:00',
    venue: 'IIT Bombay Gymkhana Grounds',
    city: 'Mumbai',
    description: 'Combat robotics showdown featuring 15kg & 30kg battlebots, plus autonomous line follower and micro-mouse maze racing.',
    price: 250,
    capacity: 200,
    teamSize: '2-4 members',
    prizePool: '₹1,00,000',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Refundable up to 3 days before matchday',
  },
  {
    id: 'tech_paper',
    title: 'TechVision: National Paper Presentation',
    category: 'College Technical',
    eventType: 'Paper Presentations',
    college: 'BMS College of Engineering',
    branch: 'All Branches',
    date: '2026-11-25T09:00',
    venue: 'BMSCE Auditorium 1',
    city: 'Bengaluru',
    description: 'Present your novel research papers across sustainable tech, semiconductor design, renewable energy, and computing.',
    price: 150,
    capacity: 100,
    teamSize: '1-2 members',
    prizePool: '₹30,000 + IEEE Publication Assistance',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Free cancellation up to 48 hours prior',
  },
  {
    id: 'tech_expo',
    title: 'InnoExhibit: Final Year Capstone Expo',
    category: 'College Technical',
    eventType: 'Project Exhibitions',
    college: 'NITK Surathkal',
    branch: 'All Branches',
    date: '2026-12-02T10:00',
    venue: 'NITK Main Seminar Hall',
    city: 'Mangaluru',
    description: 'Showcase your hardware and software working prototypes to angel investors, venture capitalists, and technical executives.',
    price: 0,
    capacity: 250,
    teamSize: '1-4 members',
    prizePool: '₹80,000 Seed Grant Funding',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Free entry for all registered project teams',
  },
  {
    id: 'tech_symposium',
    title: 'CyberSphere 2026: Technical Symposium',
    category: 'College Technical',
    eventType: 'Technical Symposiums',
    college: 'M. S. Ramaiah Institute of Technology',
    branch: 'Electronics & Comm (ECE)',
    date: '2026-12-10T09:00',
    venue: 'MSRIT Apex Block',
    city: 'Bengaluru',
    description: 'Annual flagship technical symposium including paper track, code-debugging, circuit design, and tech quiz.',
    price: 200,
    capacity: 400,
    teamSize: '1-3 members',
    prizePool: '₹60,000',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Full refund up to 24h prior',
  },
  {
    id: 'tech_ctf',
    title: 'Capture The Flag (CTF) Cyber Defense',
    category: 'College Technical',
    eventType: 'Cybersecurity Competitions',
    college: 'IIIT Bangalore',
    branch: 'Computer Science (CSE)',
    date: '2026-11-30T14:00',
    venue: 'IIITB Cyber Lab',
    city: 'Bengaluru',
    description: 'Jeopardy-style cybersecurity CTF covering reverse engineering, cryptography, web exploitation, and memory forensics.',
    price: 0,
    capacity: 180,
    teamSize: '1-3 members',
    prizePool: '₹50,000 + Bug Bounty Vouchers',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Free registration with certificate',
  },
  {
    id: 'tech_ideathon',
    title: 'Smart City Innovation Challenge',
    category: 'College Technical',
    eventType: 'Innovation Challenges',
    college: 'Dayananda Sagar College',
    branch: 'All Branches',
    date: '2026-12-15T10:00',
    venue: 'DSCE Center for Innovation',
    city: 'Bengaluru',
    description: 'Pitch technology solutions tackling municipal traffic, water conservation, renewable grids, and waste sorting.',
    price: 0,
    capacity: 200,
    teamSize: '2-4 members',
    prizePool: '₹50,000 Incubation Support',
    certificateAvailable: true,
    vendorId: 'u_organizer',
    cancellationPolicy: 'Free registration with verified certificate',
  },

  // FEATURE 2: Workshops
  {
    id: 'ws_python_rust',
    title: 'Systems Programming with Python & Rust',
    category: 'Workshop',
    track: 'Programming',
    instructor: 'Dr. Sneha Rao (Ex-Google, Systems Architect)',
    duration: '2 Days (8 Hours)',
    topics: ['Rust Fundamentals', 'PyO3 Bindings', 'Concurrency', 'Memory Safety'],
    date: '2026-11-26T10:00',
    venue: 'Tech Park Auditorium, Whitefield',
    city: 'Bengaluru',
    description: 'Deep dive into memory safety, high-performance concurrency, PyO3 bindings, and low-level optimization for distributed systems.',
    price: 499,
    capacity: 80,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 24h prior',
  },
  {
    id: 'ws_genai',
    title: 'Hands-on Generative AI & LLM Fine-Tuning',
    category: 'Workshop',
    track: 'AI & Machine Learning',
    instructor: 'Arjun Mehta (Lead AI Scientist, NeuralLabs)',
    duration: '2 Days (10 Hours)',
    topics: ['LoRA Fine-tuning', 'Vector DBs', 'RAG Pipelines', 'LangChain & LlamaIndex'],
    date: '2026-12-06T09:30',
    venue: 'Koramangala Co-Work Space',
    city: 'Bengaluru',
    description: 'Build production RAG pipelines, fine-tune open-source models with LoRA/QLoRA, and deploy AI assistants into production.',
    price: 799,
    capacity: 60,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 48h prior',
  },
  {
    id: 'ws_cybersec',
    title: 'Ethical Hacking & Network Defense Bootcamp',
    category: 'Workshop',
    track: 'Cybersecurity',
    instructor: 'Vikram Aditya (Certified Ethical Hacker CEH)',
    duration: '3 Days (12 Hours)',
    topics: ['Penetration Testing', 'Burp Suite', 'Wireshark', 'Vulnerability Assessment'],
    date: '2026-11-29T10:00',
    venue: 'Indiranagar Hub',
    city: 'Bengaluru',
    description: 'Master penetration testing methodologies, Wireshark packet analysis, Metasploit, and enterprise vulnerability scanners.',
    price: 699,
    capacity: 50,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 24h prior',
  },
  {
    id: 'ws_webdev',
    title: 'Modern Full-Stack with Next.js 15 & GraphQL',
    category: 'Workshop',
    track: 'Web Development',
    instructor: 'Priya Sharma (Principal Engineer, Vercel Fellow)',
    duration: '1 Day (6 Hours)',
    topics: ['Next.js 15', 'React Server Components', 'TypeScript', 'Prisma & GraphQL'],
    date: '2026-11-24T14:00',
    venue: 'Online Live Interactive Studio',
    city: 'Bengaluru',
    description: 'Learn server components, server actions, caching strategies, and end-to-end type safety in production-ready apps.',
    price: 0,
    capacity: 200,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free workshop - certificate upon mini-project submission',
  },
  {
    id: 'ws_cloud',
    title: 'Cloud Architecture, Docker & Kubernetes on AWS',
    category: 'Workshop',
    track: 'Cloud Computing',
    instructor: 'Rajesh Kumar (AWS Certified Solutions Architect)',
    duration: '2 Days (8 Hours)',
    topics: ['Docker Multi-stage Builds', 'Kubernetes EKS', 'CI/CD Pipelines', 'Helm'],
    date: '2026-12-14T09:00',
    venue: 'AWS Training Centre, MG Road',
    city: 'Bengaluru',
    description: 'Hands-on deployment of microservices, CI/CD pipelines, container orchestration, and Helm charts on AWS EKS.',
    price: 599,
    capacity: 75,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 24h prior',
  },
  {
    id: 'ws_uiux',
    title: 'Design Systems & Figma Prototyping Masterclass',
    category: 'Workshop',
    track: 'UI/UX Design',
    instructor: 'Neha Kapoor (Principal Product Designer)',
    duration: '1 Day (5 Hours)',
    topics: ['Figma Variables', 'Design Tokens', 'User Heuristics', 'Design Systems'],
    date: '2026-11-27T11:00',
    venue: 'HSR Layout Creative Studio',
    city: 'Bengaluru',
    description: 'Learn UX heuristics, Figma auto-layout, design tokens, micro-interactions, and developer handoff best practices.',
    price: 399,
    capacity: 45,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 24h prior',
  },
  {
    id: 'ws_robotics',
    title: 'Autonomous Mobile Robots with ROS2 & Arduino',
    category: 'Workshop',
    track: 'Robotics',
    instructor: 'Prof. K. Ramesh (Robotics Lab Director)',
    duration: '2 Days (10 Hours)',
    topics: ['ROS2 Humble', 'SLAM Navigation', 'LiDAR Mapping', 'Arduino Drivers'],
    date: '2026-12-11T10:00',
    venue: 'Robotics Makerspace, Jayanagar',
    city: 'Bengaluru',
    description: 'Assemble hardware kits, configure ROS2 nodes, test LiDAR mapping, and implement SLAM navigation on mobile robots.',
    price: 899,
    capacity: 40,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 48h prior',
  },
  {
    id: 'ws_datascience',
    title: 'Practical Big Data & Analytics with PySpark',
    category: 'Workshop',
    track: 'Data Science',
    instructor: 'Dr. Sandeep Verma (Chief Data Scientist)',
    duration: '2 Days (8 Hours)',
    topics: ['PySpark', 'ETL Pipelines', 'Distributed DataFrames', 'Parquet Storage'],
    date: '2026-12-08T10:00',
    venue: 'Virtual Interactive Lab',
    city: 'Bengaluru',
    description: 'Master distributed dataframe processing, parquet storage optimization, and statistical modeling with PySpark.',
    price: 0,
    capacity: 250,
    certificateAvailable: true,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free hands-on workshop with verified certificate',
  },

  // FEATURE 3: Museums & Tourism
  {
    id: 'mus_visvesvaraya',
    title: 'Visvesvaraya Industrial & Technological Museum',
    category: 'Museum',
    museumCategory: 'Science Museums',
    openingHours: '09:30 AM – 06:00 PM (Open all days)',
    feeDetails: 'Adults: ₹85 | Students: ₹40 | Below 5 yrs: Free',
    visitorInfo: ['Wheelchair accessible', 'Guided demonstrations daily', 'Cafeteria & parking available', 'Student discount with valid ID'],
    date: '2026-11-20T09:30',
    venue: 'Kasturba Road, Near Cubbon Park',
    city: 'Bengaluru',
    description: 'Fascinating interactive galleries on space exploration, engine mechanics, biotechnology, dinosaur animatronics, and science exhibits.',
    price: 85,
    capacity: 500,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free cancellation up to scheduled visit day',
  },
  {
    id: 'mus_hal_aero',
    title: 'HAL Heritage Centre & Aerospace Museum',
    category: 'Museum',
    museumCategory: 'Technology Museums',
    openingHours: '09:00 AM – 05:00 PM (Open all days)',
    feeDetails: 'Adults: ₹50 | Students: ₹30 | Simulators: ₹50-₹100',
    visitorInfo: ['Flight simulator rides available', 'Photography allowed', 'Outdoor landscaped park', 'Audio tour guide available'],
    date: '2026-11-20T09:00',
    venue: 'Old Airport Road, Marathahalli',
    city: 'Bengaluru',
    description: 'India’s premier aviation museum showcasing fighter jets, helicopters, commercial aircraft models, flight simulators, and ATC tower.',
    price: 50,
    capacity: 400,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free cancellation anytime before visit',
  },
  {
    id: 'mus_ngma',
    title: 'National Gallery of Modern Art (NGMA)',
    category: 'Museum',
    museumCategory: 'Art Galleries',
    openingHours: '10:00 AM – 06:00 PM (Closed Mondays)',
    feeDetails: 'Adults: ₹50 | Students: ₹20 | School Children: Free',
    visitorInfo: ['Quiet galleries with audio guides', 'Reference library & art shop', 'Wheelchair ramps throughout', 'Sculpture garden with cafe'],
    date: '2026-11-20T10:00',
    venue: 'Manikyavelu Mansion, 49 Palace Road',
    city: 'Bengaluru',
    description: 'Housed in a heritage mansion displaying modern and contemporary Indian paintings, sculptures, and visiting international art exhibits.',
    price: 50,
    capacity: 250,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free cancellation up to 24h prior',
  },
  {
    id: 'mus_govt_art',
    title: 'Government Museum & Venkatappa Art Gallery',
    category: 'Museum',
    museumCategory: 'Historical Museums',
    openingHours: '10:00 AM – 05:00 PM (Closed Mondays)',
    feeDetails: 'Adults: ₹20 | Students: ₹10',
    visitorInfo: ['Historical walking trail adjacent to museum', 'Pocket-friendly student entry', 'Guided group tours on request'],
    date: '2026-11-20T10:00',
    venue: 'Kasturba Road, Sampangi Rama Nagar',
    city: 'Bengaluru',
    description: 'Established in 1865, one of India’s oldest museums housing archaeological artifacts, ancient coins, Halmidi inscription replica, and classic pottery.',
    price: 20,
    capacity: 300,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Free cancellation anytime before visit',
  },
  {
    id: 'mus_palace',
    title: 'Bangalore Palace & Cultural Heritage Tour',
    category: 'Museum',
    museumCategory: 'Cultural Heritage',
    openingHours: '10:00 AM – 05:30 PM (Open daily)',
    feeDetails: 'Indian Citizens: ₹250 | Students: ₹150 | Foreigners: ₹450',
    visitorInfo: ['Complimentary multilingual audio guide', 'Photography passes available at counter', 'Historical royal souvenir store'],
    date: '2026-11-20T10:00',
    venue: 'Vasanth Nagar, Bengaluru',
    city: 'Bengaluru',
    description: 'Tudor-style architectural marvel built by Chamaraja Wadiyar with ornate wood carvings, royal ballroom, Victorian furnishings, and audio tour.',
    price: 250,
    capacity: 400,
    vendorId: 'u_vendor',
    cancellationPolicy: 'Full refund up to 24h prior',
  },
];

const all = () => {
  const e = db.get('events', null);
  if (e && e.length >= seed.length) return e;
  db.set('events', seed);
  return seed;
};

export const formatPrice = (n) => {
  const num = Number(n);
  if (num === 0) return 'Free';
  return '₹' + num.toLocaleString('en-IN');
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const formatShortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const inPriceRange = (price, range) => {
  if (!range || range === 'any') return true;
  if (range === '0' || range === 'free') return price === 0;
  const [lo, hi] = range.split('-');
  return price >= Number(lo || 0) && (hi === '' || price <= Number(hi));
};

export const eventService = {
  async list({
    q = '',
    category = 'All',
    eventType = 'All',
    college = 'All',
    branch = 'All',
    city = 'All',
    price = 'any',
    days = 'all',
    hasCertificate = false,
    freeOnly = false,
  } = {}) {
    if (!USE_MOCK) {
      const p = new URLSearchParams({
        q,
        category,
        event_type: eventType,
        college,
        branch,
        city,
        price,
        days,
        ...(hasCertificate ? { has_certificate: 'true' } : {}),
        ...(freeOnly ? { free_only: 'true' } : {}),
      });
      return request('/events?' + p.toString());
    }

    const term = q.trim().toLowerCase();
    const limit = days === 'all' ? Infinity : Date.now() + Number(days) * 86400000;

    return all()
      .filter((e) => category === 'All' || e.category === category)
      .filter((e) => eventType === 'All' || e.eventType === eventType || e.track === eventType || e.museumCategory === eventType)
      .filter((e) => college === 'All' || e.college === college)
      .filter((e) => branch === 'All' || !e.branch || e.branch === 'All Branches' || e.branch.includes(branch) || branch.includes(e.branch))
      .filter((e) => city === 'All' || e.city === city)
      .filter((e) => (freeOnly ? e.price === 0 : inPriceRange(e.price, price)))
      .filter((e) => !hasCertificate || e.certificateAvailable)
      .filter((e) => new Date(e.date).getTime() <= limit)
      .filter((e) => {
        if (!term) return true;
        const haystack = [
          e.title,
          e.category,
          e.eventType,
          e.track,
          e.museumCategory,
          e.venue,
          e.city,
          e.college,
          e.branch,
          e.instructor,
          e.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
  },

  async get(id) {
    if (!USE_MOCK) return request('/events/' + id);
    const e = all().find((x) => x.id === id);
    if (!e) throw new Error('Event not found');
    return e;
  },

  async cities() {
    if (!USE_MOCK) return request('/events/cities');
    return [...new Set(all().map((e) => e.city).filter(Boolean))];
  },

  async colleges() {
    if (!USE_MOCK) return request('/events/colleges');
    return [...new Set(all().map((e) => e.college).filter(Boolean))];
  },

  async listByVendor(vendorId) {
    if (!USE_MOCK) return request('/organizer/events');
    return all().filter((e) => e.vendorId === vendorId || vendorId === 'u_organizer');
  },

  async create(values) {
    if (!USE_MOCK) return request('/organizer/events', { method: 'POST', body: values });
    const e = {
      ...values,
      id: uid('ev'),
      price: Number(values.price || 0),
      capacity: Number(values.capacity || 100),
    };
    db.set('events', [...all(), e]);
    return e;
  },

  async update(id, values) {
    if (!USE_MOCK) return request('/organizer/events/' + id, { method: 'PUT', body: values });
    const list = all().map((e) =>
      e.id === id
        ? {
            ...e,
            ...values,
            price: Number(values.price || 0),
            capacity: Number(values.capacity || e.capacity),
          }
        : e
    );
    db.set('events', list);
    return list.find((e) => e.id === id);
  },

  async remove(id) {
    if (!USE_MOCK) return request('/organizer/events/' + id, { method: 'DELETE' });
    db.set('events', all().filter((e) => e.id !== id));
    return { ok: true };
  },

  // Record viewed events for "Recently Viewed"
  recordView(eventId) {
    try {
      const recent = db.get('recent_views', []);
      const updated = [eventId, ...recent.filter((id) => id !== eventId)].slice(0, 8);
      db.set('recent_views', updated);
    } catch {
      // ignore
    }
  },

  getRecentViews() {
    const ids = db.get('recent_views', []);
    const events = all();
    return ids.map((id) => events.find((e) => e.id === id)).filter(Boolean);
  },
};
