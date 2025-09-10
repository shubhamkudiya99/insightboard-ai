import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

type Task = { id: string; text: string; status: string; priority?: string; createdAt?: string; };

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(()=>{ fetchTasks(); }, []);

  async function fetchTasks(){
    try {
      const res = await axios.get(API + '/api/tasks');
      setTasks(res.data.tasks || []);
    } catch (e:any) {
      console.error(e);
    }
  }

  async function createFromTranscript(){
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(API + '/api/tasks/from-transcript', { transcript });
      // Append new tasks to existing list
      setTasks(prev => [...res.data.tasks, ...prev]);
      setTranscript('');
    } catch (e:any) {
      alert('Error: '+(e?.response?.data?.error || e.message));
    } finally { setLoading(false); }
  }

  async function toggleStatus(t:Task){
    const newStatus = t.status === 'done' ? 'pending' : 'done';
    try {
      await axios.patch(API + '/api/tasks/' + t.id, { status: newStatus });
      setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
    } catch (e:any) {
      console.error(e);
    }
  }

  async function removeTask(t:Task){
    if (!confirm('Delete this task?')) return;
    try {
      await axios.delete(API + '/api/tasks/' + t.id);
      setTasks(prev => prev.filter(x => x.id !== t.id));
    } catch (e:any) {
      console.error(e);
    }
  }

  const completed = tasks.filter(t=>t.status==='done').length;
  const pending = tasks.length - completed;
  const data = { labels: ['Completed','Pending'], datasets: [{ data: [completed, pending], hoverOffset: 4 }] };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold mb-4">InsightBoard AI</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <textarea rows={8} className="w-full border p-2 rounded mb-2" placeholder="Paste meeting transcript..." value={transcript} onChange={e=>setTranscript(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={createFromTranscript} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">Generate Tasks</button>
              <button onClick={()=>{ setTranscript(''); }} className="px-4 py-2 bg-gray-200 rounded">Clear</button>
              <button onClick={fetchTasks} className="px-4 py-2 bg-green-200 rounded">Refresh</button>
            </div>

            <div className="mt-6">
              <h2 className="font-semibold mb-2">Action Items</h2>
              <ul>
                {tasks.map(t=>(
                  <li key={t.id} className="flex items-start gap-3 p-3 border rounded mb-2">
                    <input type="checkbox" checked={t.status==='done'} onChange={()=>toggleStatus(t)} />
                    <div className="flex-1">
                      <div className={t.status==='done' ? 'line-through':' '}><strong>{t.priority}</strong> — {t.text}</div>
                      <div className="text-sm text-gray-500">{new Date(t.createdAt||'').toLocaleString()}</div>
                    </div>
                    <button onClick={()=>removeTask(t)} className="text-sm text-red-600">Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Progress</h2>
            <div className="w-64">
              <Pie data={data as any} />
            </div>
            <div className="mt-6">
              <h3 className="font-semibold">Stats</h3>
              <p>Total: {tasks.length}</p>
              <p>Completed: {completed}</p>
              <p>Pending: {pending}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
