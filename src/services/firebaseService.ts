import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDoc,
  deleteDoc,
  getDocs,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, provider);
export const signOut = () => auth.signOut();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export interface Match {
  id?: string;
  court: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  setsA: number;
  setsB: number;
  refereeEmail?: string | null;
  category: 'Đôi nam nữ' | 'Đôi nam';
  bracketInfo?: {
    roundId: string;
    matchIndex: number;
    winnerToMatchId?: string | null;
    winnerToPosition?: 'A' | 'B';
    loserToMatchId?: string | null;
    loserToPosition?: 'A' | 'B';
  };
  serving: 'A' | 'B' | null;
  status: 'upcoming' | 'live' | 'finished';
  updatedAt: any;
  currentSet: number;
  setScores: { a: number; b: number }[];
  pointHistory?: string[];
}

export async function createMatch(match: Omit<Match, 'updatedAt' | 'scoreA' | 'scoreB' | 'setsA' | 'setsB' | 'currentSet' | 'setScores' | 'serving' | 'pointHistory'>) {
  const { id, ...data } = match;
  const matchId = id || `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const path = `matches/${matchId}`;
  try {
    const docRef = doc(db, 'matches', matchId);
    await setDoc(docRef, {
      ...data,
      scoreA: 0,
      scoreB: 0,
      setsA: 0,
      setsB: 0,
      refereeEmail: match.refereeEmail || null,
      serving: 'A',
      currentSet: 1,
      setScores: [],
      pointHistory: [],
      updatedAt: serverTimestamp(),
    });
    return matchId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function propagateWinner(matchId: string, winnerName: string, loserName: string) {
    console.log(`[Propagate] Starting from ${matchId}. Winner: ${winnerName}, Loser: ${loserName}`);
    try {
        const docRef = doc(db, 'matches', matchId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            console.error(`[Propagate] Source match ${matchId} not found`);
            return;
        }
        const match = snap.data() as Match;
        
        if (!match.bracketInfo) {
            console.log(`[Propagate] Match ${matchId} has no bracketInfo, stopping.`);
            return;
        }

        const { winnerToMatchId, winnerToPosition, loserToMatchId, loserToPosition } = match.bracketInfo;

        if (winnerToMatchId) {
            console.log(`[Propagate] Winner of ${matchId} -> ${winnerToMatchId} (Pos: ${winnerToPosition})`);
            const targetRef = doc(db, 'matches', winnerToMatchId);
            const targetSnap = await getDoc(targetRef);
            if (targetSnap.exists()) {
                await updateDoc(targetRef, {
                    [winnerToPosition === 'A' ? 'teamA' : 'teamB']: winnerName,
                    updatedAt: serverTimestamp()
                });
                console.log(`[Propagate] Successfully updated target match ${winnerToMatchId}`);
            } else {
                console.warn(`[Propagate] Target match ${winnerToMatchId} does not exist in DB.`);
            }
        }

        if (loserToMatchId) {
            console.log(`[Propagate] Loser of ${matchId} -> ${loserToMatchId} (Pos: ${loserToPosition})`);
            const targetRef = doc(db, 'matches', loserToMatchId);
            const targetSnap = await getDoc(targetRef);
            if (targetSnap.exists()) {
                await updateDoc(targetRef, {
                    [loserToPosition === 'A' ? 'teamA' : 'teamB']: loserName,
                    updatedAt: serverTimestamp()
                });
                console.log(`[Propagate] Successfully updated loser target match ${loserToMatchId}`);
            } else {
                console.warn(`[Propagate] Target loser match ${loserToMatchId} does not exist in DB.`);
            }
        }
    } catch (error) {
        console.error("[Propagate] Fatal error during propagation:", error);
    }
}

export async function updateMatch(matchId: string, data: Partial<Match>) {
  const path = `matches/${matchId}`;
  try {
    const docRef = doc(db, 'matches', matchId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function finishMatch(matchId: string) {
    await updateMatch(matchId, { status: 'finished' });
}

export async function checkIsAdmin(uid: string) {
  try {
    const docRef = doc(db, 'admins', uid);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (error) {
    return false;
  }
}

export async function becomeAdmin(uid: string) {
  const path = `admins/${uid}`;
  try {
    await setDoc(doc(db, 'admins', uid), {
      email: auth.currentUser?.email,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function deleteMatch(matchId: string) {
    const path = `matches/${matchId}`;
    try {
        await deleteDoc(doc(db, 'matches', matchId));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
}

export async function deleteAllMatches() {
    const path = 'matches';
    try {
        const querySnapshot = await getDocs(collection(db, 'matches'));
        if (querySnapshot.empty) return;
        
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
}
