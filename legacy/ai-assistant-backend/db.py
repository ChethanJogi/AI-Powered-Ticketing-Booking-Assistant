"""
db.py - SQLite storage and schema management for TicketAI.
Handles Users, Events, Bookings, Wishlist, Reviews, and Certificates.
"""
import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "ticketai.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as c:
        # Users
        c.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                college TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                language TEXT DEFAULT 'English',
                created_at TEXT NOT NULL
            )
        """)

        # Events
        c.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                event_type TEXT DEFAULT '',
                college TEXT DEFAULT '',
                branch TEXT DEFAULT 'All Branches',
                city TEXT NOT NULL,
                venue TEXT NOT NULL,
                date TEXT NOT NULL,
                price REAL NOT NULL DEFAULT 0,
                capacity INTEGER NOT NULL DEFAULT 100,
                description TEXT DEFAULT '',
                instructor TEXT DEFAULT '',
                duration TEXT DEFAULT '',
                topics TEXT DEFAULT '[]',
                certificate_available INTEGER DEFAULT 0,
                opening_hours TEXT DEFAULT '',
                visitor_info TEXT DEFAULT '[]',
                rules_url TEXT DEFAULT '',
                team_size TEXT DEFAULT '1',
                organizer_id TEXT DEFAULT '',
                poster_url TEXT DEFAULT '',
                cancellation_policy TEXT DEFAULT 'Free cancellation up to 24 hours before the event',
                created_at TEXT NOT NULL
            )
        """)

        # Bookings
        c.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                event_title TEXT NOT NULL,
                event_date TEXT NOT NULL,
                venue TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_email TEXT DEFAULT '',
                qty INTEGER NOT NULL DEFAULT 1,
                team_name TEXT DEFAULT '',
                attendees TEXT DEFAULT '[]',
                amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'HELD',
                hold_expires_at INTEGER NOT NULL,
                ticket_code TEXT DEFAULT '',
                payment_ref TEXT DEFAULT '',
                checked_in_at TEXT DEFAULT NULL,
                cancellation_policy TEXT DEFAULT '',
                cancelled_at INTEGER DEFAULT NULL,
                reminder_set INTEGER DEFAULT 0,
                idempotency_key TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (event_id) REFERENCES events(id)
            )
        """)

        # Wishlist
        c.execute("""
            CREATE TABLE IF NOT EXISTS wishlist (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, event_id)
            )
        """)

        # Reviews
        c.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)

        # Certificates
        c.execute("""
            CREATE TABLE IF NOT EXISTS certificates (
                id TEXT PRIMARY KEY,
                booking_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                event_title TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                certificate_no TEXT NOT NULL UNIQUE,
                issued_date TEXT NOT NULL
            )
        """)

    seed_initial_data()

def seed_initial_data():
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_conn() as c:
        # Check if users already seeded
        row = c.execute("SELECT COUNT(*) as count FROM users").fetchone()
        if row["count"] == 0:
            c.execute("""
                INSERT INTO users (id, name, email, password, role, college, phone, language, created_at)
                VALUES 
                ('u_demo', 'Demo User', 'demo@ticketai.in', 'demo123', 'user', 'RV College of Engineering', '+91 9876543210', 'English', ?),
                ('u_vendor', 'Bharat Events', 'vendor@ticketai.in', 'demo123', 'vendor', '', '+91 9888877777', 'English', ?),
                ('u_organizer', 'RVCE Tech Club', 'organizer@ticketai.in', 'demo123', 'organizer', 'RV College of Engineering', '+91 9123456789', 'English', ?)
            """, (now_iso, now_iso, now_iso))

        # Check if events already seeded
        row_e = c.execute("SELECT COUNT(*) as count FROM events").fetchone()
        if row_e["count"] == 0:
            events_data = [
                # Existing General Events
                ('ev_neon', 'Neon Nights Music Festival', 'Music', 'festival', '', 'All Branches', 'Bengaluru', 'Palace Grounds', '2026-12-12T18:00', 1499, 500, 'A night of electronic and indie acts across three stages.', '', '', '[]', 0, '', '[]', '', '1', 'u_vendor', '', 'Full refund up to 48 hours prior', now_iso),
                ('ev_standup', 'Stand-Up Saturday', 'Comedy', 'standup', '', 'All Branches', 'Bengaluru', 'Indiranagar Social', '2026-11-21T20:00', 599, 120, 'Five comedians, one unforgettable evening.', '', '', '[]', 0, '', '[]', '', '1', 'u_vendor', '', 'Free cancellation up to 24 hours prior', now_iso),
                ('ev_startup', 'Startup Summit 2026', 'Conference', 'conference', '', 'All Branches', 'Bengaluru', 'BIEC', '2027-01-15T09:30', 2499, 800, 'Founders, investors and builders under one roof.', '', '', '[]', 1, '', '[]', '', '1', 'u_vendor', '', '50% refund up to 7 days prior', now_iso),
                ('ev_classical', 'Classical Evenings', 'Culture', 'concert', '', 'All Branches', 'Bengaluru', 'Chowdiah Memorial Hall', '2026-11-29T19:00', 799, 300, 'An evening of Carnatic and Hindustani fusion.', '', '', '[]', 0, '', '[]', '', '1', 'u_vendor', '', 'Free cancellation up to 24 hours prior', now_iso),

                # FEATURE 1: College Technical Events
                ('tech_hackindia', 'HackIndia 2026: 36h National Hackathon', 'College Technical', 'hackathon', 'RV College of Engineering', 'CSE / ISE / AI', 'Bengaluru', 'RVCE Campus, Mysore Road', '2026-11-28T09:00', 0, 300, 'Premier 36-hour hackathon addressing real-world problems in AI, Web3, and ClimateTech. Over ₹1,50,000 in prizes!', 'Industry Mentors & Judges', '36 Hours', json.dumps(['AI/ML', 'Cloud', 'Full-Stack', 'IoT']), 1, '', '[]', 'https://hackindia.rvce.edu/rules', '2-4', 'u_organizer', '', 'Free event - cancellations release seats immediately', now_iso),
                ('tech_bytecode', 'ByteCode: Competitive Coding Arena', 'College Technical', 'coding', 'PES University', 'CSE / ISE', 'Bengaluru', 'PES University, Ring Road Campus', '2026-11-22T10:00', 100, 150, 'High-intensity competitive programming duel in C++, Python, and Java. Solve dynamic programming and graph problems.', 'PES Coding Club', '4 Hours', json.dumps(['DSA', 'Algorithms', 'Speed Coding']), 1, '', '[]', '', '1', 'u_organizer', '', 'Non-refundable registration fee', now_iso),
                ('tech_neurohack', 'NeuroHack: Deep Learning Challenge', 'College Technical', 'ai_ml', 'IISc Bengaluru', 'AI / Data Science', 'Bengaluru', 'IISc Department of Computer Science', '2026-12-05T09:30', 0, 120, 'Solve challenging computer vision and LLM benchmark problems evaluated live on hidden test datasets.', 'Prof. P. V. Raghavan, IISc', '8 Hours', json.dumps(['Neural Networks', 'PyTorch', 'LLMs', 'Vision']), 1, '', '[]', '', '1-3', 'u_organizer', '', 'Free registration - please cancel 24h prior if unable to attend', now_iso),
                ('tech_robowars', 'RoboWars & Maze Solver 2026', 'College Technical', 'robotics', 'IIT Bombay', 'Mechanical / ECE', 'Mumbai', 'IIT Bombay Gymkhana Grounds', '2026-12-18T10:00', 250, 200, 'Combat robotics showdown featuring 15kg & 30kg battlebots, plus autonomous line follower and micro-mouse maze racing.', 'IITB Robotics Club', '2 Days', json.dumps(['Combat Robotics', 'Autonomous Navigation', 'Embedded']), 1, '', '[]', '', '2-4', 'u_organizer', '', 'Refundable up to 3 days before matchday', now_iso),
                ('tech_paper', 'TechVision: National Paper Presentation', 'College Technical', 'paper_presentation', 'BMS College of Engineering', 'All Branches', 'Bengaluru', 'BMSCE Auditorium 1', '2026-11-25T09:00', 150, 100, 'Present your novel research papers across sustainable tech, electronics, renewable energy, and computing.', 'IEEE Student Branch BMSCE', '1 Day', json.dumps(['Research', 'IEEE Format', 'Peer Review']), 1, '', '[]', '', '1-2', 'u_organizer', '', 'Free cancellation up to 48 hours prior', now_iso),
                ('tech_expo', 'InnoExhibit: Final Year Capstone Expo', 'College Technical', 'project_exhibition', 'NITK Surathkal', 'All Branches', 'Mangaluru', 'NITK Main Seminar Hall', '2026-12-02T10:00', 0, 250, 'Showcase your hardware and software working prototypes to angel investors and technical leaders.', 'NITK Innovation Council', '6 Hours', json.dumps(['Prototypes', 'Hardware Demo', 'Startup Showcase']), 1, '', '[]', '', '1-4', 'u_organizer', '', 'Free entry for all registered teams', now_iso),
                ('tech_symposium', 'CyberSphere 2026: Technical Symposium', 'College Technical', 'symposium', 'M. S. Ramaiah Institute of Technology', 'CSE / ISE / ECE', 'Bengaluru', 'MSRIT Apex Block', '2026-12-10T09:00', 200, 400, 'Annual flagship technical symposium including paper track, code-debugging, circuit design, and gaming.', 'Dept of CSE, MSRIT', '1 Day', json.dumps(['Technical Quiz', 'Debugging', 'Circuit Debug']), 1, '', '[]', '', '1-3', 'u_organizer', '', 'Full refund up to 24h prior', now_iso),
                ('tech_ctf', 'Capture The Flag (CTF) Cyber Defense', 'College Technical', 'cybersecurity', 'IIIT Bangalore', 'Cybersecurity / CSE', 'Bengaluru', 'IIITB Cyber Lab', '2026-11-30T14:00', 0, 180, 'Jeopardy-style cybersecurity CTF covering reverse engineering, cryptography, web exploitation, and forensics.', 'IIITB Infosec Club', '6 Hours', json.dumps(['Web Exploitation', 'Reverse Engineering', 'Crypto']), 1, '', '[]', '', '1-3', 'u_organizer', '', 'Free registration', now_iso),
                ('tech_ideathon', 'Smart City Innovation Challenge', 'College Technical', 'innovation', 'Dayananda Sagar College', 'All Branches', 'Bengaluru', 'DSCE Center for Innovation', '2026-12-15T10:00', 0, 200, 'Pitch technology solutions tackling municipal traffic, water conservation, renewable grids, and waste sorting.', 'DSCE Incubation Cell', '1 Day', json.dumps(['Pitch Deck', 'Civic Tech', 'Sustainability']), 1, '', '[]', '', '2-4', 'u_organizer', '', 'Free registration with verified certificate', now_iso),

                # FEATURE 2: Workshops
                ('ws_python_rust', 'Systems Programming with Python & Rust', 'Workshop', 'programming', '', 'All Branches', 'Bengaluru', 'Tech Park Auditorium, Whitefield', '2026-11-26T10:00', 499, 80, 'Deep dive into memory safety, high-performance concurrency, PyO3 bindings, and low-level optimization.', 'Dr. Sneha Rao (Ex-Google, Systems Architect)', '2 Days (8 Hours)', json.dumps(['Rust Basics', 'PyO3', 'Concurrency', 'Memory Safety']), 1, '', '[]', '', '1', 'u_vendor', '', 'Full refund up to 24h prior', now_iso),
                ('ws_genai', 'Hands-on Generative AI & LLM Fine-Tuning', 'Workshop', 'ai_ml', '', 'All Branches', 'Bengaluru', 'Koramangala Co-Work Space', '2026-12-06T09:30', 799, 60, 'Build RAG pipelines, fine-tune open-source models with LoRA/QLoRA, and deploy AI assistants into production.', 'Arjun Mehta (Lead AI Scientist, NeuralLabs)', '2 Days (10 Hours)', json.dumps(['LoRA Fine-tuning', 'Vector DBs', 'RAG', 'LangChain']), 1, '', '[]', '', '1', 'u_vendor', '', 'Full refund up to 48h prior', now_iso),
                ('ws_cybersec', 'Ethical Hacking & Network Defense Bootcamp', 'Workshop', 'cybersecurity', '', 'All Branches', 'Bengaluru', 'Indiranagar Hub', '2026-11-29T10:00', 699, 50, 'Master penetration testing methodologies, Wireshark packet analysis, Metasploit, and vulnerability scanners.', 'Vikram Aditya (Certified Ethical Hacker CEH)', '3 Days (12 Hours)', json.dumps(['Penetration Testing', 'Burp Suite', 'Network Security']), 1, '', '[]', '', '1', 'u_vendor', '', 'Full refund up to 24h prior', now_iso),
                ('ws_webdev', 'Modern Full-Stack with Next.js 15 & GraphQL', 'Workshop', 'web_development', '', 'All Branches', 'Bengaluru', 'Online Live Interactive', '2026-11-24T14:00', 0, 200, 'Learn server components, server actions, caching strategies, and end-to-end type safety in production.', 'Priya Sharma (Principal Engineer, Vercel Fellow)', '1 Day (6 Hours)', json.dumps(['Next.js 15', 'React Server Components', 'TypeScript']), 1, '', '[]', '', '1', 'u_vendor', '', 'Free workshop - certificate upon project submission', now_iso),
                ('ws_cloud', 'Cloud Architecture, Docker & Kubernetes on AWS', 'Workshop', 'cloud_computing', '', 'All Branches', 'Bengaluru', 'AWS Training Centre, MG Road', '2026-12-14T09:00', 599, 75, 'Hands-on deployment of microservices, CI/CD pipelines, container orchestration, and Helm charts on AWS EKS.', 'Rajesh Kumar (AWS Certified Solutions Architect)', '2 Days (8 Hours)', json.dumps(['Docker', 'Kubernetes EKS', 'CI/CD Pipelines']), 1, '', '[]', '', '1', 'u_vendor', '', 'Full refund up to 24h prior', now_iso),
                ('ws_uiux', 'Design Systems & Figma Prototyping Masterclass', 'Workshop', 'ui_ux', '', 'All Branches', 'Bengaluru', 'HSR Layout Creative Studio', '2026-11-27T11:00', 399, 45, 'Learn UX heuristics, Figma auto-layout, design tokens, micro-interactions, and developer handoff best practices.', 'Neha Kapoor (Principal Product Designer)', '1 Day (5 Hours)', json.dumps(['Figma Variables', 'Design Tokens', 'User Research']), 1, '', '[]', '', '1', 'u_vendor', '', 'Full refund up to 24h prior', now_iso),
                ('ws_robotics', 'Autonomous Mobile Robots with ROS2 & Arduino', 'Workshop', 'robotics', '', 'All Branches', 'Bengaluru', 'Robotics Makerspace, Jayanagar', '2026-12-11T10:00', 899, 40, 'Assemble hardware kits, configure ROS2 nodes, test LiDAR mapping, and implement SLAM navigation.', 'Prof. K. Ramesh (Robotics Lab Director)', '2 Days (10 Hours)', json.dumps(['ROS2 Humble', 'SLAM Navigation', 'LiDAR Sensors']), 1, '', '[]', '', '1', 'u_vendor', '', 'Full refund up to 48h prior', now_iso),
                ('ws_datascience', 'Practical Big Data & Analytics with PySpark', 'Workshop', 'data_science', '', 'All Branches', 'Bengaluru', 'Virtual Interactive Lab', '2026-12-08T10:00', 0, 250, 'Master distributed dataframe processing, parquet storage optimization, and statistical modeling with PySpark.', 'Dr. Sandeep Verma (Chief Data Scientist)', '2 Days (8 Hours)', json.dumps(['PySpark', 'ETL Pipelines', 'Big Data Analytics']), 1, '', '[]', '', '1', 'u_vendor', '', 'Free hands-on workshop with certification', now_iso),

                # FEATURE 3: Museums & Tourism
                ('mus_visvesvaraya', 'Visvesvaraya Industrial & Technological Museum', 'Museum', 'science_museum', '', '', 'Bengaluru', 'Kasturba Road, Near Cubbon Park', '2026-11-20T09:30', 85, 500, 'Fascinating interactive galleries on space exploration, engine mechanics, biotechnology, and fun science exhibits for all ages.', '', 'Full Day Tour', json.dumps(['Dinosaur Alive', 'Space Gallery', 'Engine Hall', 'Biotech']), 0, '09:30 AM – 06:00 PM (Open all days)', json.dumps(['Wheelchair accessible', 'Guided demonstrations daily', 'Cafeteria & parking available', 'Student discount with valid ID']), '', '1', 'u_vendor', '', 'Free cancellation up to scheduled visit day', now_iso),
                ('mus_hal_aero', 'HAL Heritage Centre & Aerospace Museum', 'Museum', 'technology_museum', '', '', 'Bengaluru', 'Old Airport Road, Marathahalli', '2026-11-20T09:00', 50, 400, 'India’s premier aviation museum showcasing fighter jets, helicopters, commercial aircraft models, flight simulators, and air traffic control tower.', '', '3-4 Hours', json.dumps(['Fighter Aircraft', 'Flight Simulators', 'Aerospace Hall']), 0, '09:00 AM – 05:00 PM (Open all days)', json.dumps(['Flight simulator rides available (nominal fee)', 'Photography allowed', 'Outdoor landscaped park', 'Audio tour guide available']), '', '1', 'u_vendor', '', 'Free cancellation anytime before visit', now_iso),
                ('mus_ngma', 'National Gallery of Modern Art (NGMA)', 'Museum', 'art_gallery', '', '', 'Bengaluru', 'Manikyavelu Mansion, 49 Palace Road', '2026-11-20T10:00', 50, 250, 'Housed in a heritage mansion displaying modern and contemporary Indian paintings, sculptures, and special visiting art exhibits.', '', '2-3 Hours', json.dumps(['Sculpture Garden', 'Modern Indian Art', 'Special Exhibitions']), 0, '10:00 AM – 06:00 PM (Closed on Mondays)', json.dumps(['Quiet galleries with audio guides', 'Reference library & art shop', 'Wheelchair ramps throughout', 'Free entry for students up to 12th']), '', '1', 'u_vendor', '', 'Free cancellation up to 24h prior', now_iso),
                ('mus_govt_art', 'Government Museum & Venkatappa Art Gallery', 'Museum', 'historical_museum', '', '', 'Bengaluru', 'Kasturba Road, Sampangi Rama Nagar', '2026-11-20T10:00', 20, 300, 'Established in 1865, one of India’s oldest museums housing archaeological artifacts, ancient coins, Halmidi inscription replica, and classic pottery.', '', '2-3 Hours', json.dumps(['Ancient Sculptures', 'Archaeological Finds', 'Geological Specimens']), 0, '10:00 AM – 05:00 PM (Closed on Mondays)', json.dumps(['Historical walking trail adjacent to museum', 'Pocket-friendly student entry (₹10)', 'Guided group tours on request']), '', '1', 'u_vendor', '', 'Free cancellation anytime before visit', now_iso),
                ('mus_palace', 'Bangalore Palace & Cultural Heritage Tour', 'Museum', 'cultural_heritage', '', '', 'Bengaluru', 'Vasanth Nagar, Bengaluru', '2026-11-20T10:00', 250, 400, 'Tudor-style architectural marvel built by Chamaraja Wadiyar with ornate wood carvings, royal ballroom, Victorian furnishings, and audio tour.', '', '3-4 Hours', json.dumps(['Royal Courtyard', 'Tudor Architecture', 'Wadiyar Royal Artifacts']), 0, '10:00 AM – 05:30 PM (Open daily)', json.dumps(['Complimentary multilingual audio guide', 'Photography passes available at counter', 'Historical royal souvenir store']), '', '1', 'u_vendor', '', 'Full refund up to 24h prior', now_iso)
            ]

            c.executemany("""
                INSERT INTO events (
                    id, title, category, event_type, college, branch, city, venue, date, price,
                    capacity, description, instructor, duration, topics, certificate_available,
                    opening_hours, visitor_info, rules_url, team_size, organizer_id, poster_url,
                    cancellation_policy, created_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, events_data)

        # Seed initial reviews
        row_r = c.execute("SELECT COUNT(*) as count FROM reviews").fetchone()
        if row_r["count"] == 0:
            c.execute("""
                INSERT INTO reviews (id, event_id, user_id, user_name, rating, comment, created_at)
                VALUES 
                ('rev_1', 'tech_hackindia', 'u_demo', 'Demo User', 5, 'Superbly organized hackathon with top-tier mentors from Bengaluru startups!', ?),
                ('rev_2', 'ws_genai', 'u_demo', 'Demo User', 5, 'The fine-tuning labs and RAG pipelines were immediately useful in my work. Recommended!', ?),
                ('rev_3', 'mus_visvesvaraya', 'u_demo', 'Demo User', 4, 'Great educational exhibits, especially the dinosaur and aviation galleries.', ?)
            """, (now_iso, now_iso, now_iso))

