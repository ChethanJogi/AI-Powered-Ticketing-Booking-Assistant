require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 8000;

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[TicketAI Backend Server running on port ${PORT}]`);
    console.log(`[AI Assistant API available at http://localhost:${PORT}/api/assistant]`);
  });
}

startServer();

