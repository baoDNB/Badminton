import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCw, Trash2, Plus, Shuffle, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RandomWheelProps {
  onAssignTeams: (teams: string[]) => void;
  onTeamPicked?: (team: string) => void;
  maxTeams?: number;
  names?: string[];
  onNamesChange?: (names: string[]) => void;
}

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', 
  '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', 
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6'
];

export function RandomWheel({ onAssignTeams, onTeamPicked, maxTeams = 16, names: controlledNames, onNamesChange }: RandomWheelProps) {
  const [internalNames, setInternalNames] = useState<string[]>([]);
  const names = controlledNames ?? internalNames;
  const setNames = onNamesChange ?? setInternalNames;

  const [newName, setNewName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWheel = (currentRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    ctx.clearRect(0, 0, size, size);

    const items = names.length > 0 ? names : ['Thêm tên...'];
    const sliceAngle = (Math.PI * 2) / items.length;

    items.forEach((name, i) => {
      const startAngle = i * sliceAngle + currentRotation;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Inter';
      ctx.fillText(name.substring(0, 15), radius - 30, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#171717';
    ctx.fill();
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel(rotation);
  }, [names, rotation]);

  const spin = () => {
    if (isSpinning || names.length < 1) return;

    setIsSpinning(true);
    setWinner(null);

    const spinDuration = 4000;
    const startValue = rotation;
    const extraSpins = 5 + Math.random() * 5;
    const endValue = startValue + extraSpins * Math.PI * 2 + Math.random() * Math.PI * 2;
    
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / spinDuration, 1);
      
      // Easing out cubic
      const easeT = 1 - Math.pow(1 - t, 3);
      const currentRotation = startValue + (endValue - startValue) * easeT;
      
      setRotation(currentRotation);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const finalRotation = currentRotation % (Math.PI * 2);
        const sliceAngle = (Math.PI * 2) / names.length;
        
        const normalizedRot = (Math.PI * 2 - (finalRotation % (Math.PI * 2))) % (Math.PI * 2);
        const winnerIndex = Math.floor(normalizedRot / sliceAngle);
        const winningName = names[winnerIndex];
        const newNames = names.filter((_, i) => i !== winnerIndex);
        
        setWinner(winningName);
        setNames(newNames);
        if (onTeamPicked) onTeamPicked(winningName);

        if (newNames.length === 1) {
            setTimeout(() => {
                 const lastWinner = newNames[0];
                 setWinner(lastWinner);
                 setNames([]);
                 if (onTeamPicked) onTeamPicked(lastWinner);
            }, 1000);
        }
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [COLORS[winnerIndex % COLORS.length]]
        });
      }
    };

    requestAnimationFrame(animate);
  };

  const addName = () => {
    if (newName.trim() && names.length < maxTeams) {
      setNames([...names, newName.trim()]);
      setNewName('');
    }
  };

  const removeName = (index: number) => {
    setNames(names.filter((_, i) => i !== index));
  };

  const shuffleAndFill = () => {
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    onAssignTeams(shuffled);
  };

  const handleTextPaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      const lines = text.split(/\n|,/).map(s => s.trim()).filter(Boolean);
      const newNames = [...names, ...lines].slice(0, maxTeams);
      setNames(newNames);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start justify-center p-6 bg-neutral-900 rounded-3xl border border-neutral-800">
      {/* Left: Input List */}
      <div className="w-full md:w-80 space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-2">Danh sách tên ({names.length}/{maxTeams})</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addName()}
              placeholder="Nhập tên..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button 
              onClick={addName}
              className="p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div 
            className="h-64 overflow-y-auto border border-neutral-800 rounded-xl bg-neutral-950 p-2 space-y-1 scrollbar-hide"
            onPaste={handleTextPaste}
        >
          {names.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-xs text-center p-4">
              <Send size={24} className="mb-2 opacity-20" />
              <p>Dán danh sách tên vào đây (mỗi dòng một tên)</p>
            </div>
          )}
          {names.map((name, i) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={`${name}-${i}`}
              className="flex items-center justify-between group bg-neutral-900 p-2 rounded-lg border border-transparent hover:border-neutral-700 transition-all"
            >
              <span className="text-sm font-medium">{name}</span>
              <button 
                onClick={() => removeName(i)}
                className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setNames([])}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-400 text-xs font-bold rounded-xl hover:bg-neutral-700 transition-all uppercase tracking-widest"
          >
            <Trash2 size={14} /> Xóa hết
          </button>
          <button 
            onClick={shuffleAndFill}
            disabled={names.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-xl hover:bg-emerald-500/20 transition-all uppercase tracking-widest disabled:opacity-50"
          >
            <Shuffle size={14} /> Xếp bảng
          </button>
        </div>
      </div>

      {/* Right: Wheel */}
      <div className="relative flex flex-col items-center">
        <div className="relative">
          {/* Pointer */}
          <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[20px] border-r-white drop-shadow-lg" />
          </div>

          <canvas 
            ref={canvasRef} 
            width={340} 
            height={340}
            className="rounded-full shadow-2xl shadow-emerald-500/10"
          />

          <button 
            onClick={spin}
            disabled={isSpinning || names.length < 1}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white text-black shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:scale-100 font-black uppercase text-xs z-20"
          >
            {isSpinning ? <RotateCw className="animate-spin" /> : 'SPIN'}
          </button>
        </div>

        <AnimatePresence>
          {winner && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 p-4 bg-emerald-500 text-black rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-3"
            >
              <Trophy size={20} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Kết quả</span>
                <span className="text-xl font-black">{winner}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
