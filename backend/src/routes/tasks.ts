import express from 'express';
import { extractActionItems } from '../services/llm';
import TaskModel from '../models/task';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const router = express.Router();

// In-memory fallback store
let inMemory: any[] = [];

// GET /api/tasks
router.get('/tasks', async (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  if (mongoReady) {
    const docs = await TaskModel.find().sort({ createdAt: -1 }).lean();
    return res.json({ tasks: docs });
  } else {
    return res.json({ tasks: inMemory.slice().reverse() });
  }
});

// POST /api/tasks/from-transcript
router.post('/tasks/from-transcript', async (req, res) => {
  const { transcript } = req.body || {};
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'transcript (string) is required' });
  }
  const items = await extractActionItems(transcript);
  const saved:any[] = [];
  const mongoReady = mongoose.connection.readyState === 1;
  for (const it of items) {
    const obj = { id: uuidv4(), text: it.text, status: 'pending', priority: it.priority||'Medium', createdAt: new Date() };
    if (mongoReady) {
      try {
        const doc = new TaskModel(obj);
        await doc.save();
        saved.push(doc.toObject());
      } catch (e) {
        saved.push(obj);
      }
    } else {
      inMemory.push(obj);
      saved.push(obj);
    }
  }
  res.json({ tasks: saved });
});

// PATCH /api/tasks/:id  (toggle status or update)
router.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const mongoReady = mongoose.connection.readyState === 1;
  if (mongoReady) {
    const doc = await TaskModel.findOne({ id });
    if (!doc) return res.status(404).json({ error: 'not found' });
    if (status) doc.status = status;
    await doc.save();
    return res.json({ task: doc.toObject() });
  } else {
    const idx = inMemory.findIndex(t=>t.id===id);
    if (idx<0) return res.status(404).json({ error: 'not found' });
    if (status) inMemory[idx].status = status;
    return res.json({ task: inMemory[idx] });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const mongoReady = mongoose.connection.readyState === 1;
  if (mongoReady) {
    const doc = await TaskModel.findOneAndDelete({ id });
    if (!doc) return res.status(404).json({ error: 'not found' });
    return res.json({ ok: true });
  } else {
    const idx = inMemory.findIndex(t=>t.id===id);
    if (idx<0) return res.status(404).json({ error: 'not found' });
    inMemory.splice(idx,1);
    return res.json({ ok: true });
  }
});

export default router;
