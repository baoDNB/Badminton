import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Trophy, 
  History,
  ChevronLeft,
  ChevronRight,
  Users,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  auth, 
  signIn, 
  signOut, 
  db, 
  Match, 
  createMatch, 
  updateMatch, 
  checkIsAdmin,
  testConnection,
  deleteMatch,
  deleteAllMatches,
  becomeAdmin,
  propagateWinner
} from './services/firebaseService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, where, doc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { RandomWheel } from './components/RandomWheel';

// --- Components ---

function LoginScreen() {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await signIn();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép hiện popup hoặc mở ứng dụng trong tab mới.');
      } else {
        setError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại hoặc mở trong tab mới.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md p-8 rounded-[2rem] bg-neutral-900 border border-neutral-800 text-center space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full" />
        
        <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 relative z-10">
          <Trophy className="w-8 h-8 text-black" />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Badminton Pro</h1>
          <p className="text-neutral-500 text-sm mt-2 font-medium">Hệ thống ghi điểm trực tuyến thời gian thực</p>
        </div>

        <div className="space-y-4 relative z-10">
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 flex-shrink-0" />
            Đăng nhập với Google
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold flex items-start gap-3 text-left">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-6 bg-neutral-800/30 rounded-2xl border border-neutral-800/50 text-left space-y-3">
            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={12} /> Mẹo cho điện thoại
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Nếu không thể đăng nhập, hãy nhấn vào biểu tượng <span className="text-white font-bold">"Mở trong tab mới"</span> hoặc <span className="text-white font-bold">"Chia sẻ"</span> ở góc màn hình để mở ứng dụng toàn màn hình.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TournamentBracket({ matches, category, format }: { matches: Match[], category?: string, format?: '16 đội' | '12 đội (Double Chance 1.5)' }) {
  const availableCategories = Array.from(new Set(matches.map(m => m.category))).filter(Boolean) as string[];
  
  // If category is "Tất cả", prefer "Đôi nam nữ" if it exists, otherwise use the first available category
  const displayCategory = (category === 'Tất cả' || !category) 
    ? (availableCategories.includes('Đôi nam nữ') ? 'Đôi nam nữ' : availableCategories[0])
    : category;

  const filteredMatches = displayCategory 
    ? matches.filter(m => m.category === displayCategory)
    : [];

  const tournamentIds = [...new Set(filteredMatches.map(m => m.id.split('_')[0]))];
  const latestTournamentId = tournamentIds[0];
  const latestTournamentMatches = latestTournamentId 
      ? filteredMatches.filter(m => m.id.startsWith(latestTournamentId))
      : [];
    
  const inferredFormat = latestTournamentMatches.length >= 28 ? '16 đội' : '12 đội (Double Chance 1.5)';
  const tournamentFormat = format || inferredFormat;

  const rounds = tournamentFormat === '12 đội (Double Chance 1.5)' ? [
    { id: 'round1', name: 'Vòng 1', matchIndices: [1, 2, 3, 4, 5, 6] },
    { id: 'round2', name: 'Playoff', matchIndices: [7, 8, 9] },
    { id: 'round3', name: 'Tứ Kết', matchIndices: [10, 11, 12, 13] },
    { id: 'round4', name: 'Bán Kết', matchIndices: [14, 15] },
    { id: 'round5', name: 'Tranh giải 3', matchIndices: [16] },
    { id: 'round6', name: 'Chung Kết', matchIndices: [17] }, 
  ] : [
    { id: 'round1', name: 'Vòng 1', matchIndices: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 'round2', name: 'Vòng 2 (T/L)', matchIndices: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'round_rep', name: 'Vé Vớt', matchIndices: [17, 18, 19, 20] },
    { id: 'round3', name: 'Tứ Kết', matchIndices: [21, 22, 23, 24] },
    { id: 'round4', name: 'Bán Kết', matchIndices: [25, 26] },
    { id: 'round5', name: 'Chung Kết', matchIndices: [28, 27] }, 
  ];

  const getMatchByTitleIdx = (idx: number) => {
    return latestTournamentMatches.find(m => m.bracketInfo?.matchIndex === idx);
  };

  if (latestTournamentMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-neutral-900/10 rounded-[2rem] border border-dashed border-neutral-800 mx-4">
        <Trophy className="w-12 h-12 text-neutral-800 mb-4 opacity-50" />
        <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Chưa có sơ đồ cho hạng mục này</p>
        {category && <p className="text-[9px] text-neutral-700 mt-2 italic">Hạng mục: {category}</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-8 scrollbar-hide">
      <div className="flex gap-8 min-w-max px-4">
        {rounds.map((round) => (
          <div key={round.id} className="w-64 flex-shrink-0 space-y-6">
            <div className="text-center pb-4 border-b border-neutral-800">
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">{round.name}</h3>
            </div>
            <div className="space-y-4">
              {round.matchIndices.map((idx) => {
                const match = getMatchByTitleIdx(idx);
                if (!match) return null;
                
                const isFinished = match.status === 'finished';
                const winner = isFinished ? (match.setsA > match.setsB ? 'A' : 'B') : null;

                return (
                  <div key={idx} className={`relative p-3 rounded-2xl border transition-all ${
                    match.status === 'live' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-neutral-900/50 border-neutral-800'
                  }`}>
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-neutral-800 border border-neutral-700 rounded-md flex items-center justify-center text-[8px] font-black text-neutral-500 z-10 shadow-sm">
                      {idx}
                    </div>
                    
                    <div className="space-y-2">
                       <div className={`flex justify-between items-center text-[10px] font-bold transition-colors ${winner === 'A' ? 'text-emerald-400' : 'text-neutral-400'}`}>
                          <span className="truncate max-w-[120px]">{match.teamA}</span>
                          <span className="font-mono bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">{match.setsA}</span>
                       </div>
                       <div className={`flex justify-between items-center text-[10px] font-bold transition-colors ${winner === 'B' ? 'text-emerald-400' : 'text-neutral-400'}`}>
                          <span className="truncate max-w-[120px]">{match.teamB}</span>
                          <span className="font-mono bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">{match.setsB}</span>
                       </div>
                    </div>

                    {match.status === 'live' && (
                       <div className="absolute -right-1 -top-1">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ user }: { user: FirebaseUser }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<string[]>(Array(16).fill(''));
  const [tournamentFormat, setTournamentFormat] = useState<'16 đội' | '12 đội (Double Chance 1.5)'>('16 đội');
  const [category, setCategory] = useState<'Đôi nam nữ' | 'Đôi nam'>('Đôi nam nữ');
  const [defaultRefereeEmail, setDefaultRefereeEmail] = useState('');
  const [filterCategory, setFilterCategory] = useState<'Tất cả' | 'Đôi nam nữ' | 'Đôi nam'>('Tất cả');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'tournament' | 'monitor' | 'history' | 'bracket' | 'luckywheel'>('monitor');

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });
  }, []);

  const activeMatches = matches.filter(m => m.status !== 'finished' && (filterCategory === 'Tất cả' || m.category === filterCategory));
  const historyMatches = matches.filter(m => m.status === 'finished' && (filterCategory === 'Tất cả' || m.category === filterCategory));

  const handleDeleteAll = async () => {
    if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn XÓA TẤT CẢ trận đấu không? Dữ liệu sẽ không thể khôi phục.')) {
      setLoading(true);
      try {
        const q = query(collection(db, 'matches'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            alert('Không có trận đấu nào để xóa');
            return;
        }
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert(`Đã xóa thành công ${snapshot.docs.length} trận đấu`);
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra khi xóa trận đấu: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }
  };

  const generateTournament12 = async () => {
    const activeTeams = teams.slice(0, 12);
    if (activeTeams.filter(t => t.trim() !== '').length !== 12) {
        alert("Vui lòng điền đủ 12 đội");
        return;
    }
    
    const slugify = (str: string) => {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
    };

    setLoading(true);
    const tournamentId = `T12-${slugify(category)}-${Date.now()}`;
    const mId = (idx: number) => `${tournamentId}_m${idx}`;

    try {
        const pWinners = [
            { w: mId(10), wp: 'A', l: mId(7), lp: 'A' }, // M1
            { w: mId(11), wp: 'A', l: mId(7), lp: 'B' }, // M2
            { w: mId(12), wp: 'A', l: mId(8), lp: 'A' }, // M3
            { w: mId(13), wp: 'A', l: mId(8), lp: 'B' }, // M4
            { w: mId(13), wp: 'B', l: mId(9), lp: 'A' }, // M5
            { w: mId(12), wp: 'B', l: mId(9), lp: 'B' }, // M6
        ];

        // Vòng 1: 6 matches (12 teams)
        for (let i = 0; i < 6; i++) {
            await createMatch({
                id: mId(i + 1),
                court: `Sân ${(i % 3) + 1}`,
                category: category,
                teamA: activeTeams[i * 2],
                teamB: activeTeams[i * 2 + 1],
                status: 'upcoming',
                bracketInfo: { 
                    roundId: 'Vòng 1', 
                    matchIndex: i + 1,
                    winnerToMatchId: pWinners[i].w,
                    winnerToPosition: pWinners[i].wp as 'A' | 'B',
                    loserToMatchId: pWinners[i].l,
                    loserToPosition: pWinners[i].lp as 'A' | 'B'
                }
            });
        }

        // Vòng Playoff: 3 matches (6 losers from V1)
        for (let i = 0; i < 3; i++) {
            await createMatch({
                id: mId(i + 7),
                court: `Sân ${(i % 3) + 1}`,
                category: category,
                teamA: 'Chờ M' + (i * 2 + 1),
                teamB: 'Chờ M' + (i * 2 + 2),
                status: 'upcoming',
                bracketInfo: { roundId: 'Vòng Vé Vớt', matchIndex: i + 7 } // Winners do not auto-propagate
            });
        }

        // Tứ kết: 4 matches
        const qfTeams = [
            { a: 'Thắng M1', b: 'Vé Vớt 2', w: mId(14), wp: 'A' }, // M10
            { a: 'Thắng M2', b: 'Vé Vớt 1', w: mId(15), wp: 'A' }, // M11
            { a: 'Thắng M3', b: 'Thắng M6', w: mId(15), wp: 'B' }, // M12
            { a: 'Thắng M4', b: 'Thắng M5', w: mId(14), wp: 'B' }, // M13
        ];
        for (let i = 0; i < 4; i++) {
            await createMatch({
                id: mId(i + 10),
                court: `Sân ${(i % 4) + 1}`,
                category: category,
                teamA: qfTeams[i].a,
                teamB: qfTeams[i].b,
                status: 'upcoming',
                bracketInfo: { 
                    roundId: 'Tứ Kết', 
                    matchIndex: i + 10,
                    winnerToMatchId: qfTeams[i].w,
                    winnerToPosition: qfTeams[i].wp as 'A' | 'B',
                }
            });
        }

        // Bán kết: 2 matches
        const sfTeams = [
            { a: 'Thắng M10', b: 'Thắng M13', w: mId(17), wp: 'A', l: mId(16), lp: 'A' }, // M14
            { a: 'Thắng M11', b: 'Thắng M12', w: mId(17), wp: 'B', l: mId(16), lp: 'B' }, // M15
        ];
        for (let i = 0; i < 2; i++) {
             await createMatch({
                id: mId(i + 14),
                court: `Sân 1`,
                category: category,
                teamA: sfTeams[i].a,
                teamB: sfTeams[i].b,
                status: 'upcoming',
                bracketInfo: { 
                    roundId: 'Bán Kết', 
                    matchIndex: i + 14,
                    winnerToMatchId: sfTeams[i].w,
                    winnerToPosition: sfTeams[i].wp as 'A' | 'B',
                    loserToMatchId: sfTeams[i].l,
                    loserToPosition: sfTeams[i].lp as 'A' | 'B'
                }
            });
        }

        // Tranh giải 3: 1 match
        await createMatch({
            id: mId(16),
            court: 'Sân 1',
            category: category,
            teamA: 'Thua M14',
            teamB: 'Thua M15',
            status: 'upcoming',
            bracketInfo: { roundId: 'Tranh Giải 3', matchIndex: 16 }
        });

        // Chung kết: 1 match
        await createMatch({
            id: mId(17),
            court: 'Sân 1',
            category: category,
            teamA: 'Thắng M14',
            teamB: 'Thắng M15',
            status: 'upcoming',
            bracketInfo: { roundId: 'Chung Kết', matchIndex: 17 }
        });
        
        alert("Đã khởi tạo giải đấu 12 đội (Double Chance 1.5). Tổng 17 trận.");
        setActiveTab('monitor');
    } catch (e) {
        console.error("Tournament generation failed:", e);
        alert("Có lỗi xảy ra khi tạo giải đấu");
    }
    setLoading(false);
  };

  const generateTournament = async () => {
    if (teams.some(t => !t.trim())) {
        return;
    }
    
    const slugify = (str: string) => {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
    };

    setLoading(true);
    const tournamentId = `T16-${slugify(category)}`;
    
    // Helper to generate a consistent match ID
    const mId = (idx: number) => `${tournamentId}_m${idx}`;

    try {
        console.log("Starting tournament generation...");
        // Vòng 1: Matches 1-8
        for (let i = 0; i < 8; i++) {
            await createMatch({
                id: mId(i + 1),
                court: `Sân ${(i % 4) + 1}`,
                category: category,
                refereeEmail: defaultRefereeEmail || null,
                teamA: teams[i * 2],
                teamB: teams[i * 2 + 1],
                status: 'upcoming',
                bracketInfo: {
                    roundId: 'Vòng 1',
                    matchIndex: i + 1,
                    winnerToMatchId: mId(9 + Math.floor(i / 2)),
                    winnerToPosition: i % 2 === 0 ? 'A' : 'B',
                    loserToMatchId: mId(13 + Math.floor(i / 2)),
                    loserToPosition: i % 2 === 0 ? 'A' : 'B'
                }
            });
        }

        // Vòng 2 Nhánh Thắng (M9-M12)
        for (let i = 0; i < 4; i++) {
            await createMatch({
                id: mId(i + 9),
                court: `Sân ${(i % 4) + 1}`,
                category: category,
                refereeEmail: defaultRefereeEmail || null,
                teamA: `Thắng M${i * 2 + 1}`,
                teamB: `Thắng M${i * 2 + 2}`,
                status: 'upcoming',
                bracketInfo: {
                    roundId: 'Vòng 2 (Nhánh Thắng)',
                    matchIndex: i + 9,
                    winnerToMatchId: mId(21 + i), // Win goes to QF M21-M24
                    winnerToPosition: 'A',
                    loserToMatchId: mId(20 - i), // Lose goes to Vé Vớt M20, M19, M18, M17
                    loserToPosition: 'A'
                }
            });
        }

        // Vòng 2 Nhánh Thua (M13-M16)
        for (let i = 0; i < 4; i++) {
            await createMatch({
                id: mId(i + 13),
                court: `Sân ${(i % 4) + 1}`,
                category: category,
                refereeEmail: defaultRefereeEmail || null,
                teamA: `Thua M${i * 2 + 1}`,
                teamB: `Thua M${i * 2 + 2}`,
                status: 'upcoming',
                bracketInfo: {
                    roundId: 'Vòng 2 (Nhánh Thua)',
                    matchIndex: i + 13,
                    winnerToMatchId: mId(17 + i), // Win goes to Vé Vớt M17-M20
                    winnerToPosition: 'B'
                }
            });
        }

        // Vòng Vé Vớt (M17-M20): Thua Nhánh Thắng vs Thắng Nhánh Thua
        for (let i = 0; i < 4; i++) {
            await createMatch({
                id: mId(i + 17),
                court: `Sân ${(i % 4) + 1}`,
                category: category,
                refereeEmail: defaultRefereeEmail || null,
                teamA: `Thua M${12 - i}`,
                teamB: `Thắng M${13 + i}`,
                status: 'upcoming',
                bracketInfo: {
                    roundId: 'Vòng Vé Vớt',
                    matchIndex: i + 17,
                    winnerToMatchId: mId(21 + i), // Win goes to QF M21-M24
                    winnerToPosition: 'B'
                }
            });
        }

        // Vòng 3 Tứ Kết: Matches 21-24
        for (let i = 0; i < 4; i++) {
            await createMatch({
                id: mId(i + 21),
                court: `Sân ${(i % 4) + 1}`,
                category: category,
                refereeEmail: defaultRefereeEmail || null,
                teamA: `Thắng M${i + 9}`,
                teamB: `Thắng M${i + 17}`,
                status: 'upcoming',
                bracketInfo: {
                    roundId: 'Tứ Kết',
                    matchIndex: i + 21,
                    winnerToMatchId: mId(25 + Math.floor(i / 2)),
                    winnerToPosition: i % 2 === 0 ? 'A' : 'B'
                }
            });
        }

        // Vòng 4 Bán Kết: Matches 25-26
        for (let i = 0; i < 2; i++) {
            await createMatch({
                id: mId(i + 25),
                court: `Sân 1`,
                category: category,
                refereeEmail: defaultRefereeEmail || null,
                teamA: `Thắng M${i * 2 + 21}`,
                teamB: `Thắng M${i * 2 + 22}`,
                status: 'upcoming',
                bracketInfo: {
                    roundId: 'Bán Kết',
                    matchIndex: i + 25,
                    winnerToMatchId: mId(28),
                    winnerToPosition: i === 0 ? 'A' : 'B',
                    loserToMatchId: mId(27),
                    loserToPosition: i === 0 ? 'A' : 'B'
                }
            });
        }

        // Vòng 5: Tranh Giải 3 (Match 27)
        await createMatch({
            id: mId(27),
            court: `Sân 1`,
            category: category,
            refereeEmail: defaultRefereeEmail || null,
            teamA: `Thua BK 1`,
            teamB: `Thua BK 2`,
            status: 'upcoming',
            bracketInfo: {
                roundId: 'Tranh Giải 3',
                matchIndex: 27
            }
        });

        // Vòng 5: Chung Kết (Match 28)
        await createMatch({
            id: mId(28),
            court: `Sân 1`,
            category: category,
            refereeEmail: defaultRefereeEmail || null,
            teamA: `Thắng BK 1`,
            teamB: `Thắng BK 2`,
            status: 'upcoming',
            bracketInfo: {
                roundId: 'Chung Kết',
                matchIndex: 28
            }
        });

        console.log("Tournament generated successfully!");
        setActiveTab('monitor');
    } catch (e) {
        console.error("Tournament generation failed:", e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-12">
      {/* Tab Navigation */}
      <div className="flex bg-neutral-900 p-1.5 rounded-3xl gap-2 border border-neutral-800 shadow-xl overflow-x-auto scrollbar-hide">
        {[
          { id: 'monitor', label: 'Giám sát', icon: LayoutDashboard },
          { id: 'bracket', label: 'Sơ đồ', icon: Trophy },
          { id: 'luckywheel', label: 'Bốc thăm', icon: RotateCcw },
          { id: 'tournament', label: 'Giải đấu 16 đội', icon: Trophy },
          { id: 'history', label: 'Lịch sử', icon: History }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tournament' && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <button onClick={() => setActiveTab('luckywheel')} className="hover:scale-110 transition-transform">
                        <RotateCcw size={64} className="text-emerald-500" />
                    </button>
                </div>
                <div className="relative z-10 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Lập Giải Đấu</h2>
                            <div className="flex gap-2">
                                {['16 đội', '12 đội (Double Chance 1.5)'].map((fmt) => (
                                    <button 
                                      key={fmt}
                                      onClick={() => setTournamentFormat(fmt as any)}
                                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        tournamentFormat === fmt ? 'bg-emerald-500 text-black shadow-lg' : 'bg-neutral-800 text-neutral-500 hover:text-white'
                                      }`}
                                    >
                                      {fmt}
                                    </button>
                                ))}
                            </div>
                            <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">
                                {tournamentFormat === '16 đội' ? 'Hệ thống Double Elimination tự động' : 'Thể thức Double Chance 1.5'}
                            </p>
                            <div className="mt-4 flex bg-black/50 p-1 rounded-xl gap-1 border border-neutral-800">
                              {['Đôi nam nữ', 'Đôi nam'].map((cat) => (
                                <button 
                                  key={cat}
                                  onClick={() => setCategory(cat as any)}
                                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    category === cat ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-600 hover:text-neutral-400'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                            <input 
                              type="email"
                              placeholder="Email Trọng tài mặc định"
                              className="w-full md:w-64 bg-black/50 border border-neutral-800 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-emerald-500 transition-all placeholder:text-neutral-700"
                              value={defaultRefereeEmail}
                              onChange={(e) => setDefaultRefereeEmail(e.target.value)}
                            />
                            <button 
                                disabled={loading}
                                onClick={tournamentFormat === '16 đội' ? generateTournament : generateTournament12}
                                className="w-full md:w-auto px-10 py-4 bg-emerald-500 text-black font-black rounded-2xl uppercase text-xs tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                            >
                                {loading ? 'Đang khởi tạo...' : 'Tạo Giải Đấu'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {teams.slice(0, tournamentFormat === '16 đội' ? 16 : 12).map((team, idx) => (
                            <div key={idx} className="relative">
                                <span className="absolute -top-2 -left-2 w-6 h-6 bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center text-[10px] font-black text-emerald-500 z-10 shadow-lg">{idx + 1}</span>
                                <input 
                                    placeholder={`Tên đội ${idx + 1}`}
                                    className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded-2xl text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all placeholder:text-neutral-800"
                                    value={team}
                                    onChange={(e) => {
                                        const newTeams = [...teams];
                                        newTeams[idx] = e.target.value;
                                        setTeams(newTeams);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </motion.section>
        )}

        {activeTab === 'monitor' && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <LayoutDashboard className="text-emerald-500" size={20} /> Giám sát trực tiếp
                  </h2>
                  <div className="flex gap-2 items-center mt-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['Tất cả', 'Đôi nam nữ', 'Đôi nam'].map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => setFilterCategory(cat as any)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                          filterCategory === cat 
                          ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' 
                          : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">{activeMatches.length} Trận</span>
                    <button 
                        onClick={() => setActiveTab('bracket')}
                        className="text-[10px] font-black bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full hover:text-white transition-all uppercase tracking-widest"
                    >
                        Sơ đồ
                    </button>
                    <button 
                        onClick={handleDeleteAll}
                        disabled={loading || matches.length === 0}
                        className="text-[10px] font-black bg-red-500/10 text-red-500 px-3 py-1 rounded-full hover:bg-red-500/20 transition-all disabled:opacity-50 uppercase tracking-widest"
                    >
                        Xóa tất cả
                    </button>
                </div>
            </div>
            <div className="grid gap-4">
            {activeMatches.map(match => (
                <div key={match.id} className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-neutral-700 transition-all shadow-lg active:scale-[0.99] cursor-default">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-emerald-500/70 tracking-[0.2em]">{match.court} {match.bracketInfo && ` / ${match.bracketInfo.roundId}`}</span>
                      <span className="text-[9px] font-black text-neutral-800 uppercase tracking-widest">[{match.category}]</span>
                    </div>
                    <h3 className="font-black text-white text-xl tracking-tight uppercase italic">
                    {match.teamA} <span className="text-neutral-700 not-italic mx-1">vs</span> {match.teamB}
                    </h3>
                    <div className="flex gap-2 items-center">
                    {match.status === 'live' && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black tracking-widest uppercase">Trực tiếp</span>
                        </div>
                    )}
                    {match.status === 'upcoming' && <span className="text-[9px] bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">Chờ thi đấu</span>}
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="email"
                        placeholder="Email Trọng tài"
                        defaultValue={match.refereeEmail || ''}
                        onBlur={async (e) => {
                          const newEmail = e.target.value.trim() || null;
                          if (newEmail !== match.refereeEmail && match.id) {
                            try {
                              await updateMatch(match.id, { refereeEmail: newEmail });
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="bg-neutral-800/50 border border-neutral-800 text-[9px] px-2 py-1 rounded-[0.5rem] w-40 text-neutral-400 focus:border-emerald-500 outline-none transition-all"
                      />
                      <span className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">
                        {match.refereeEmail ? 'Đã gán' : 'Bỏ trống'}
                      </span>
                    </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-8">
                    <div className="text-right">
                    <p className="text-4xl font-black tabular-nums tracking-tighter leading-none mb-1">
                        <span className="text-emerald-500">{match.scoreA}</span>
                        <span className="text-neutral-800 mx-2">:</span>
                        <span className="text-sky-500">{match.scoreB}</span>
                    </p>
                    <p className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.2em]">Trận đấu</p>
                    </div>
                    <button 
                    onClick={() => match.id && deleteMatch(match.id)}
                    className="p-3 bg-neutral-800/50 text-neutral-600 hover:text-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:bg-red-500/10"
                    >
                    <Trash2 size={18} />
                    </button>
                </div>
                </div>
            ))}
            {activeMatches.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-neutral-900 rounded-[2rem] bg-neutral-900/10">
                    <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Không có trận nào đang diễn ra</p>
                </div>
            )}
            </div>
          </motion.section>
        )}

        {activeTab === 'bracket' && (
          <motion.div 
            key="bracket"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <LayoutDashboard className="text-emerald-500" size={20} /> Sơ đồ thi đấu
                  </h2>
                  <div className="flex gap-2 items-center mt-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['Tất cả', 'Đôi nam nữ', 'Đôi nam'].map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => setFilterCategory(cat as any)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                          filterCategory === cat 
                          ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' 
                          : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                    onClick={() => setActiveTab('monitor')}
                    className="text-[10px] font-black bg-neutral-800 text-neutral-400 px-4 py-2 rounded-full hover:text-white transition-all uppercase tracking-widest"
                >
                    Đóng
                </button>
            </div>
            <TournamentBracket matches={matches} category={filterCategory} />
          </motion.div>
        )}
        {activeTab === 'luckywheel' && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center px-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Vòng Quay May Mắn</h2>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Bốc thăm chia bảng ngẫu nhiên</p>
              </div>
              <button 
                onClick={() => setActiveTab('tournament')}
                className="px-6 py-2 bg-neutral-800 text-neutral-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
              >
                Về quản lý đội
              </button>
            </div>

            <RandomWheel 
              onAssignTeams={(newTeams) => {
                setTeams(newTeams);
                setActiveTab('tournament');
              }}
              onTeamPicked={(winner) => {
                const emptyIdx = teams.findIndex(t => !t || t.trim() === '');
                if (emptyIdx !== -1) {
                    const newTeams = [...teams];
                    newTeams[emptyIdx] = winner;
                    setTeams(newTeams);
                }
              }}
            />
          </motion.section>
        )}

        {activeTab === 'history' && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <History className="text-sky-500" size={20} /> Lịch sử thi đấu
                  </h2>
                  <div className="flex gap-2 items-center mt-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['Tất cả', 'Đôi nam nữ', 'Đôi nam'].map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => setFilterCategory(cat as any)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                          filterCategory === cat 
                          ? 'bg-sky-500 text-black border-sky-500 shadow-lg shadow-sky-500/20' 
                          : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-black bg-sky-500/10 text-sky-500 px-3 py-1 rounded-full">{historyMatches.length} Kết quả</span>
                    <button 
                        onClick={handleDeleteAll}
                        disabled={loading || matches.length === 0}
                        className="text-[10px] font-black bg-red-500/10 text-red-500 px-3 py-1 rounded-full hover:bg-red-500/20 transition-all disabled:opacity-50 uppercase tracking-widest"
                    >
                        Xóa tất cả
                    </button>
                </div>
            </div>
            <div className="space-y-4 text-left">
            {historyMatches.map(match => (
                <div key={match.id} className="bg-neutral-950 border border-neutral-900 p-6 rounded-[2rem] group hover:border-neutral-800 transition-all opacity-80 hover:opacity-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black bg-neutral-900 px-3 py-1 rounded-full text-neutral-500 uppercase tracking-widest">{match.court}</span>
                        <span className="text-[9px] font-black text-neutral-800 uppercase tracking-widest">[{match.category}]</span>
                        {match.bracketInfo && <span className="text-[10px] font-black bg-neutral-900 px-3 py-1 rounded-full text-neutral-600 uppercase tracking-widest italic">{match.bracketInfo.roundId}</span>}
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest italic">Xong</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 items-center text-center gap-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{match.teamA}</h4>
                        <div className="flex justify-center gap-1">
                            {[0].map(i => (
                            <div key={i} className={`w-6 h-1 rounded-full ${i < match.setsA ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-900'}`} />
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <div className="text-3xl font-black tabular-nums tracking-tighter text-neutral-200">
                            {match.setsA} - {match.setsB}
                        </div>
                        <span className="text-[8px] font-black text-neutral-700 uppercase tracking-[0.3em] mt-1">Kết quả t.đấu</span>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{match.teamB}</h4>
                        <div className="flex justify-center gap-1">
                            {[0].map(i => (
                            <div key={i} className={`w-6 h-1 rounded-full ${i < match.setsB ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'bg-neutral-900'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-900/50 flex justify-center gap-4">
                    {match.setScores.map((score, idx) => (
                        <div key={idx} className="flex flex-col items-center px-4 py-2 bg-neutral-900/30 rounded-2xl border border-neutral-900">
                        <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest mb-1">Hiệp {idx + 1}</span>
                        <p className="text-xs font-mono font-bold text-neutral-400">
                            {score.a} - {score.b}
                        </p>
                        </div>
                    ))}
                </div>
                </div>
            ))}
            {historyMatches.length === 0 && (
                <div className="text-center py-20 bg-neutral-900/10 rounded-[2rem] border-2 border-dashed border-neutral-900">
                    <p className="text-neutral-700 font-bold uppercase tracking-widest text-[9px]">Chưa có lịch sử thi đấu</p>
                </div>
            )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function RefereeView({ isAdmin, user }: { isAdmin: boolean, user: FirebaseUser }) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [showBracket, setShowBracket] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('Tất cả');
  const [loading, setLoading] = useState(false);

  const handleDeleteAll = async () => {
    if (!isAdmin) return;
    if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn XÓA TẤT CẢ trận đấu không? Dữ liệu sẽ không thể khôi phục.')) {
      setLoading(true);
      try {
        const q = query(collection(db, 'matches'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            alert('Không có trận đấu nào để xóa');
            return;
        }
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert(`Đã xóa thành công ${snapshot.docs.length} trận đấu`);
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCommitPlayoff = async () => {
    if (!isAdmin) return;
    const categoryMatches = allMatches.filter(m => (filterCategory === 'Tất cả' || filterCategory === m.category) && m.id);
    if (categoryMatches.length === 0) return;
    const currentTourneyId = categoryMatches[0].id.split('_')[0];
    const tourneyMatches = allMatches.filter(m => m.id.startsWith(currentTourneyId));
    
    const playoffs = tourneyMatches.filter(m => m.bracketInfo?.roundId === 'Vòng Vé Vớt');
    if (playoffs.length !== 3) {
        alert('Giải đấu này không phải định dạng 12 đội hoặc không tìm thấy các trận Vé Vớt.');
        return;
    }
    if (!playoffs.every(m => m.status === 'finished')) {
        alert('Phải chờ cả 3 trận Vé Vớt (Playoff) kết thúc mới có thể tính hiệu số.');
        return;
    }

    if (!window.confirm('Chốt kết quả Vé Vớt: Xét hiệu số 3 đội thắng, 2 đội điểm cao nhất sẽ vào Tứ Kết. Xác nhận?')) return;
    
    setLoading(true);
    try {
        const pWinners = playoffs.map(m => {
            const isAWinner = m.setsA > m.setsB || m.scoreA > m.scoreB;
            const winnerTeam = isAWinner ? m.teamA : m.teamB;
            // Hiệu số = Điểm thắng - Điểm thua
            const hieuSo = isAWinner ? (m.scoreA - m.scoreB) : (m.scoreB - m.scoreA);
            return { team: winnerTeam, hieuSo, matchId: m.id, topScore: Math.max(m.scoreA, m.scoreB) };
        });
        
        // Sort by Point Difference descending. If tied, sort by topScore descending.
        pWinners.sort((a, b) => b.hieuSo - a.hieuSo || b.topScore - a.topScore);
        
        const top1 = pWinners[0].team;
        const top2 = pWinners[1].team;
        
        // Find QF Matches
        const qfMatches = tourneyMatches.filter(m => m.bracketInfo?.roundId === 'Tứ Kết');
        const qf1 = qfMatches.find(m => m.teamA === 'Vé Vớt 1' || m.teamB === 'Vé Vớt 1');
        const qf2 = qfMatches.find(m => m.teamA === 'Vé Vớt 2' || m.teamB === 'Vé Vớt 2');
        
        if (qf1) {
            await updateMatch(qf1.id, {
                teamA: qf1.teamA === 'Vé Vớt 1' ? top1 : qf1.teamA,
                teamB: qf1.teamB === 'Vé Vớt 1' ? top1 : qf1.teamB
            });
        }
        if (qf2) {
            await updateMatch(qf2.id, {
                teamA: qf2.teamA === 'Vé Vớt 2' ? top2 : qf2.teamA,
                teamB: qf2.teamB === 'Vé Vớt 2' ? top2 : qf2.teamB
            });
        }
        alert(`Đã chốt xong! ${top1} (HS: ${pWinners[0].hieuSo}) và ${top2} (HS: ${pWinners[1].hieuSo}) vào Tứ Kết. Đội ${pWinners[2].team} bị loại.`);
    } catch(err) {
        console.error(err);
        alert('Có lỗi khi chốt vé vớt.');
    }
    setLoading(false);
  };

  useEffect(() => {
    // List upcoming and live matches for referee
    let q = query(collection(db, 'matches'), where('status', 'in', ['upcoming', 'live']), orderBy('updatedAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      // Clientside filtering to show only assigned matches for non-admins
      if (isAdmin) {
        setAvailableMatches(all);
      } else {
        // Show matches assigned to this specific email (case-insensitive)
        setAvailableMatches(all.filter(m => {
          if (!m.refereeEmail || !user.email) return false;
          return m.refereeEmail.toLowerCase() === user.email.toLowerCase();
        }));
      }
    });
  }, [isAdmin, user.email]);

  useEffect(() => {
    // Fetch all for bracket view
    const q = query(collection(db, 'matches'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setAllMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });
  }, []);

  useEffect(() => {
    if (!selectedMatchId) {
        setCurrentMatch(null);
        return;
    }
    return onSnapshot(doc(db, 'matches', selectedMatchId), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentMatch({ id: docSnap.id, ...docSnap.data() } as Match);
      }
    });
  }, [selectedMatchId]);

  const handleEndMatch = async () => {
    if (!currentMatch || currentMatch.status === 'finished') return;
    if (!confirm("Bạn chắc chắn muốn xác nhận kết thúc trận đấu? Kết quả sẽ được ghi vào lịch sử.")) return;

    const setsA = currentMatch.scoreA > currentMatch.scoreB ? 1 : 0;
    const setsB = currentMatch.scoreA > currentMatch.scoreB ? 0 : 1;

    await updateMatch(currentMatch.id!, { 
        status: 'finished',
        setsA,
        setsB
    });
    
    // Propagate winner
    const winnerName = currentMatch.scoreA > currentMatch.scoreB ? currentMatch.teamA : currentMatch.teamB;
    const loserName = currentMatch.scoreA > currentMatch.scoreB ? currentMatch.teamB : currentMatch.teamA;
    propagateWinner(currentMatch.id!, winnerName, loserName).catch(console.error);
    
    setSelectedMatchId(null);
  };

  const handlePoint = async (team: 'A' | 'B') => {
    if (!currentMatch || currentMatch.status === 'finished') return;

    const newAScore = team === 'A' ? currentMatch.scoreA + 1 : currentMatch.scoreA;
    const newBScore = team === 'B' ? currentMatch.scoreB + 1 : currentMatch.scoreB;
    const pointEntry = `Đội ${team === 'A' ? currentMatch.teamA : currentMatch.teamB} ghi điểm (${newAScore}-${newBScore}) lúc ${new Date().toLocaleTimeString('vi-VN')}`;

    const update: Partial<Match> = {
        scoreA: newAScore,
        scoreB: newBScore,
        serving: team,
        status: 'live',
        pointHistory: [...(currentMatch.pointHistory || []), pointEntry]
    };

    await updateMatch(currentMatch.id!, update);
  };

  const handleUndo = async () => {
    if (!currentMatch || currentMatch.status === 'finished') return;
    if (currentMatch.scoreA === 0 && currentMatch.scoreB === 0) return;

    const newHistory = currentMatch.pointHistory ? [...currentMatch.pointHistory] : [];
    newHistory.pop(); // Remove the last point entry

    const update: Partial<Match> = {
        updatedAt: serverTimestamp(),
        pointHistory: newHistory
    };

    // Very simple undo: just decrement the last point if we know who got it (serving)
    if (currentMatch.serving === 'A' && currentMatch.scoreA > 0) {
        update.scoreA = currentMatch.scoreA - 1;
    } else if (currentMatch.serving === 'B' && currentMatch.scoreB > 0) {
        update.scoreB = currentMatch.scoreB - 1;
    }

    await updateMatch(currentMatch.id!, update);
  };

  const forceFinish = async (winner: 'A' | 'B') => {
    if (!currentMatch) return;
    if (!confirm(`Bạn chắc chắn muốn kết thúc trận đấu và xử thắng cho ${winner === 'A' ? currentMatch.teamA : currentMatch.teamB}?`)) return;

    const winnerName = winner === 'A' ? currentMatch.teamA : currentMatch.teamB;
    const loserName = winner === 'A' ? currentMatch.teamB : currentMatch.teamA;

    const update: Partial<Match> = {
        status: 'finished',
        setsA: winner === 'A' ? 1 : 0,
        setsB: winner === 'B' ? 1 : 0,
        updatedAt: serverTimestamp()
    };

    await updateMatch(currentMatch.id!, update);
    // Non-blocking propagation
    propagateWinner(currentMatch.id!, winnerName, loserName).catch(console.error);
  };

  if (!selectedMatchId) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center px-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase text-white tracking-tighter italic">Sân thi đấu</h2>
              <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">Dành cho trọng tài</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
                {isAdmin && (
                    <button 
                        onClick={handleCommitPlayoff}
                        className="px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                    >
                        Chốt Vé Vớt
                    </button>
                )}
                <button 
                  onClick={() => setShowBracket(!showBracket)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    showBracket ? 'bg-emerald-500 text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white'
                  }`}
                >
                  {showBracket ? 'Xem Sân' : 'Sơ đồ cây'}
                </button>
                {isAdmin && (
                  <button 
                    onClick={handleDeleteAll}
                    disabled={loading || allMatches.length === 0}
                    className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Đang xóa...' : 'Xóa tất cả'}
                  </button>
                )}
            </div>
        </header>

        {showBracket ? (
          <div className="space-y-8">
             <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-4">
                {['Tất cả', 'Đôi nam', 'Đôi nam nữ'].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                            filterCategory === cat ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-neutral-900 text-neutral-500'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
             </div>
             <TournamentBracket matches={allMatches} category={filterCategory} />
          </div>
        ) : (
          <div className="grid gap-4">
            {availableMatches.filter(m => m.status !== 'finished').map(match => (
              <button 
                key={match.id}
                onClick={() => setSelectedMatchId(match.id!)}
                className="bg-neutral-900 border border-neutral-800 p-6 rounded-[2rem] flex items-center justify-between hover:border-emerald-500 hover:bg-neutral-800/50 transition-all text-left shadow-xl group"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">{match.court}</span>
                  <p className="font-black text-white text-xl mt-1 tracking-tight">{match.teamA} vs {match.teamB}</p>
                  <p className="text-[9px] text-neutral-500 uppercase font-bold mt-2">Trạng thái: {match.status === 'live' ? 'Đang đấu' : 'Chưa đấu'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors text-neutral-500">
                  <ChevronRight size={20} />
                </div>
              </button>
            ))}
            {availableMatches.filter(m => m.status !== 'finished').length === 0 && (
                <div className="text-center py-20 text-neutral-500 bg-neutral-900/30 rounded-[2rem] border-2 border-dashed border-neutral-900 px-6">
                    <AlertCircle className="mx-auto mb-4 opacity-20" size={48} />
                    <p className="font-medium tracking-tight text-sm">Bạn chưa được gán trận nào hoặc các trận đã kết thúc.</p>
                    <p className="text-[10px] mt-2 opacity-50 uppercase tracking-widest">Vui lòng đợi BTC cập nhật</p>
                </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!currentMatch) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => setSelectedMatchId(null)}
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Thoát sân
        </button>

        <div className="flex gap-2">
            <button 
                onClick={handleUndo}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
            >
                <RotateCcw size={14} /> Hoàn tác
            </button>
            <div 
                onClick={handleEndMatch}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all relative z-50 pointer-events-auto cursor-pointer"
            >
                <Trophy size={14} /> Xác nhận kết thúc
            </div>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-[2.5rem] p-6 md:p-12 space-y-10 border-2 border-neutral-800 shadow-2xl overflow-hidden relative">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">{currentMatch.court}</span>
                  <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest italic">[{currentMatch.category}]</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1 uppercase tracking-tight">Trận đấu <span className="text-neutral-500 font-normal">/ 25 Pts</span></h3>
            </div>
            <div className="flex gap-2">
                {currentMatch.setScores.map((s, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-xl bg-black text-[10px] font-mono border border-neutral-800 text-neutral-400">
                        {s.a}-{s.b}
                    </div>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-10">
            {/* Team A */}
            <div 
                onClick={() => handlePoint('A')}
                className={`p-8 md:p-14 rounded-[2rem] border-2 cursor-pointer flex flex-col items-center gap-6 transition-all active:scale-95 ${
                    currentMatch.serving === 'A' ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/5' : 'bg-neutral-800/30 border-neutral-800'
                }`}
            >
                {currentMatch.serving === 'A' && <span className="text-[9px] font-black text-black uppercase tracking-widest bg-emerald-500 px-3 py-1 rounded-full">GIAO CẦU</span>}
                <div className="text-center">
                    <p className="text-xs text-neutral-500 uppercase font-black tracking-widest mb-4 truncate max-w-[140px]">{currentMatch.teamA}</p>
                    <AnimatePresence mode="popLayout">
                        <motion.p 
                            key={currentMatch.scoreA}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-8xl md:text-[10rem] font-black tabular-nums leading-none tracking-tighter ${currentMatch.serving === 'A' ? 'text-emerald-500' : 'text-neutral-600'}`}
                        >
                            {currentMatch.scoreA}
                        </motion.p>
                    </AnimatePresence>
                </div>
                <div className="flex gap-2">
                    {[0].map(i => (
                        <div key={i} className={`w-10 h-2 rounded-full transition-colors duration-500 ${i < currentMatch.setsA ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-neutral-900'}`} />
                    ))}
                </div>
            </div>

            {/* Team B */}
            <div 
                onClick={() => handlePoint('B')}
                className={`p-8 md:p-14 rounded-[2rem] border-2 cursor-pointer flex flex-col items-center gap-6 transition-all active:scale-95 ${
                    currentMatch.serving === 'B' ? 'bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/5' : 'bg-neutral-800/30 border-neutral-800'
                }`}
            >
                {currentMatch.serving === 'B' && <span className="text-[9px] font-black text-black uppercase tracking-widest bg-sky-500 px-3 py-1 rounded-full">GIAO CẦU</span>}
                <div className="text-center">
                    <p className="text-xs text-neutral-500 uppercase font-black tracking-widest mb-4 truncate max-w-[140px]">{currentMatch.teamB}</p>
                    <AnimatePresence mode="popLayout">
                        <motion.p 
                            key={currentMatch.scoreB}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-8xl md:text-[10rem] font-black tabular-nums leading-none tracking-tighter ${currentMatch.serving === 'B' ? 'text-sky-500' : 'text-neutral-600'}`}
                        >
                            {currentMatch.scoreB}
                        </motion.p>
                    </AnimatePresence>
                </div>
                <div className="flex gap-2">
                    {[0].map(i => (
                        <div key={i} className={`w-10 h-2 rounded-full transition-colors duration-500 ${i < currentMatch.setsB ? 'bg-sky-500 shadow-sm shadow-sky-500/50' : 'bg-neutral-900'}`} />
                    ))}
                </div>
            </div>
        </div>

        {/* --- Point History Display --- */}
        <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
            <h4 className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-4">Lịch sử điểm</h4>
            <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-neutral-500 uppercase px-4">
                    <span>Đội</span>
                    <span>Tỉ số</span>
                    <span className="col-span-2 text-right">Thời gian</span>
                </div>
                {(currentMatch.pointHistory || []).slice().reverse().slice(0, 10).map((entry, idx) => {
                    // Expecting format: "Đội <Name> ghi điểm (<AScore>-<BScore>) lúc <Time>"
                    // A simple regex approach to split the string
                    const match = entry.match(/Đội (.+) ghi điểm \((.+)\) lúc (.+)/);
                    if (!match) return <div key={idx} className="px-4 py-2 bg-neutral-800 rounded-lg text-sm text-white">{entry}</div>;
                    const [_, teamName, score, time] = match;
                    return (
                        <div key={idx} className="grid grid-cols-4 gap-2 px-4 py-3 bg-neutral-800 rounded-xl text-sm font-medium text-white items-center">
                            <span className="truncate">{teamName}</span>
                            <span>{score}</span>
                            <span className="col-span-2 text-right font-mono text-neutral-400">{time}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        {currentMatch.status === 'finished' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl z-50"
            >
                <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 rotate-12 shadow-2xl shadow-emerald-500/20">
                    <Trophy className="w-12 h-12 text-black" />
                </div>
                <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-tight mb-2">
                    {currentMatch.setsA > currentMatch.setsB ? currentMatch.teamA : currentMatch.teamB} <br/> CHIẾN THẮNG!
                </h2>
                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setSelectedMatchId(null)}
                    className="px-10 py-4 bg-white text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Về danh sách sân
                  </button>
                </div>
            </motion.div>
        )}
      </div>

      <div className="p-6 bg-neutral-900/30 border border-neutral-800 rounded-[2rem] flex items-center gap-4 text-neutral-500">
           <div className="p-2 bg-neutral-800 rounded-lg"><AlertCircle size={20} /></div>
           <p className="text-[10px] uppercase font-black tracking-widest leading-relaxed">
             Trọng tài: Điểm số bạn nhập sẽ được cập nhật TRỰC TIẾP lên bảng tổng hợp của Ban tổ chức.
           </p>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'admin' | 'referee'>('referee');

  useEffect(() => {
    testConnection();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const adminStatus = await checkIsAdmin(u.uid);
        setIsAdmin(adminStatus);
        if (adminStatus) setView('admin');
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-2xl shadow-emerald-500/20" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      <header className="p-4 bg-neutral-900/40 backdrop-blur-xl border-b border-neutral-800 sticky top-0 z-[100]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center border border-neutral-700 shadow-lg group">
                <Trophy className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
             </div>
             <div>
                <h1 className="text-sm font-black uppercase tracking-tight leading-none mb-1">Badminton Pro</h1>
                <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">
                  {isAdmin ? 'Ban Tổ Chức' : 'Trọng Tài Sân'}
                </p>
                {!isAdmin && user && (
                  <p className="text-[7px] text-neutral-700 font-mono mt-0.5 select-all">UID: {user.uid}</p>
                )}
             </div>
          </div>

          <div className="flex items-center gap-3">
            {!isAdmin && user?.email && ['baopa0805@gmail.com', 'tongducduy4@gmail.com'].includes(user.email) && (
              <button 
                onClick={async () => {
                  const success = await becomeAdmin(user.uid);
                  if (success) window.location.reload();
                }}
                className="px-4 py-2 bg-emerald-500 text-black text-[10px] font-black rounded-xl uppercase tracking-widest hover:scale-105 transition-transform"
              >
                Kích hoạt quyền Admin
              </button>
            )}
            {isAdmin && (
              <div className="flex bg-black/50 p-1 rounded-2xl gap-1 border border-neutral-800 shadow-inner">
                <button 
                  onClick={() => setView('admin')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    view === 'admin' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Tổng hợp
                </button>
                <button 
                  onClick={() => setView('referee')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    view === 'referee' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Điều khiển
                </button>
              </div>
            )}
            <button 
              onClick={signOut}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-white transition-colors rounded-xl hover:bg-neutral-800"
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "circOut" }}
          >
            {view === 'admin' ? <AdminDashboard user={user} /> : <RefereeView isAdmin={isAdmin} user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="max-w-4xl mx-auto p-12 text-center space-y-4 border-t border-neutral-900/50 mt-12">
          <p className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.3em]">
            Sync Engine v2.0 • Real-time Badminton Protocol
          </p>
          <div className="flex justify-center items-center gap-3">
              <div className="px-3 py-1 bg-emerald-500/5 rounded-full flex items-center gap-2 border border-emerald-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[9px] font-black uppercase tracking-tight text-emerald-500/80">Hệ thống sẵn sàng</span>
              </div>
          </div>
      </footer>

      {/* Aesthetic Overlays */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-emerald-500/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[50vw] h-[50vw] bg-sky-500/5 blur-[150px] rounded-full" />
      </div>
    </div>
  );
}

