require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const port = 3000;

app.use(cors());
app.use(express.json());

// Seed initial students if none exist
async function seedStudents() {
  const count = await prisma.student.count();
  if (count === 0) {
    const defaultStudents = [
      { id: 's1', name: 'Aman kumar', roll: '01' },
      { id: 's2', name: 'Ajay Singh', roll: '02' },
      { id: 's3', name: 'Rohan Mehta', roll: '03' },
      { id: 's4', name: 'Adarsh Tiwari', roll: '04' },
      { id: 's5', name: 'Arjun Kumar', roll: '05' },
      { id: 's6', name: 'Aman Sharma', roll: '06' },
    ];
    for (const s of defaultStudents) {
      await prisma.student.create({ data: s });
    }
    console.log('Database seeded with default students.');
  }
}

// ---- ROUTES ----

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Add a student
app.post('/api/students', async (req, res) => {
  const { name, roll } = req.body;
  try {
    const student = await prisma.student.create({
      data: { name, roll }
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add student or roll number already exists' });
  }
});

// Delete a student
app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Also delete related attendance and tickets to avoid foreign key constraints errors
    await prisma.attendance.deleteMany({ where: { studentId: id } });
    await prisma.ticket.deleteMany({ where: { studentId: id } });
    
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Get all attendance
app.get('/api/attendance', async (req, res) => {
  try {
    const records = await prisma.attendance.findMany();
    
    // Transform flat records to a nested structure: { 'YYYY-MM-DD': { studentId: 'P' } }
    const attMap = {};
    for (const r of records) {
      if (!attMap[r.date]) attMap[r.date] = {};
      attMap[r.date][r.studentId] = r.status;
    }
    res.json(attMap);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Mark attendance
app.post('/api/attendance', async (req, res) => {
  const { date, studentId, status } = req.body;
  try {
    // Upsert attendance for date + studentId
    const record = await prisma.attendance.upsert({
      where: {
        date_studentId: { date, studentId }
      },
      update: { status },
      create: { date, studentId, status }
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark attendance', details: error.message });
  }
});

// Get all tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Create a ticket
app.post('/api/tickets', async (req, res) => {
  const { studentId, date, reason } = req.body;
  try {
    const ticket = await prisma.ticket.create({
      data: { studentId, date, reason, status: 'Pending' }
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket status
app.patch('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { status, date, studentId } = req.body; // Pass these to optionally mark present
  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status }
    });
    
    if (status === 'Approved' && date && studentId) {
       await prisma.attendance.upsert({
         where: { date_studentId: { date, studentId } },
         update: { status: 'P' },
         create: { date, studentId, status: 'P' }
       });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

app.listen(port, async () => {
  console.log(`Backend server running on http://localhost:${port}`);
  await seedStudents();
});
