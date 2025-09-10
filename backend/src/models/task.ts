import mongoose, { Schema } from 'mongoose';

export interface ITask {
  id?: string;
  text: string;
  status: 'pending' | 'done';
  priority?: 'High'|'Medium'|'Low';
  createdAt?: Date;
}

const TaskSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['pending','done'], default: 'pending' },
  priority: { type: String, enum: ['High','Medium','Low'], default: 'Medium' },
  createdAt: { type: Date, default: () => new Date() }
});

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
