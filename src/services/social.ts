import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  increment,
  updateDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Post, Follow, UserProfile, LiveTrackPosition, Flight, Comment } from '../types/models';

// ===== feed =====
// public feed: ALLE posts, unabhängig von follows (so gewünscht)
export async function getPublicFeed(pageLimit = 20): Promise<Post[]> {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageLimit));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Post);
}

// kuratierter feed: nur posts von leuten denen man folgt
export async function getFollowingFeed(followedUids: string[], pageLimit = 20): Promise<Post[]> {
  if (followedUids.length === 0) return [];
  // firestore 'in' ist auf 30 werte begrenzt, für mehr würde man batchen
  const q = query(
    collection(db, 'posts'),
    where('uid', 'in', followedUids.slice(0, 30)),
    orderBy('createdAt', 'desc'),
    limit(pageLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Post);
}

// ===== follow =====
export async function followUser(followerUid: string, followingUid: string): Promise<void> {
  const followId = `${followerUid}_${followingUid}`;
  const follow: Follow = { followerUid, followingUid, createdAt: Date.now() };
  await setDoc(doc(db, 'follows', followId), follow);
  await updateDoc(doc(db, 'users', followerUid), { followingCount: increment(1) });
  await updateDoc(doc(db, 'users', followingUid), { followerCount: increment(1) });
}

export async function unfollowUser(followerUid: string, followingUid: string): Promise<void> {
  const followId = `${followerUid}_${followingUid}`;
  await deleteDoc(doc(db, 'follows', followId));
  await updateDoc(doc(db, 'users', followerUid), { followingCount: increment(-1) });
  await updateDoc(doc(db, 'users', followingUid), { followerCount: increment(-1) });
}

export async function isFollowing(followerUid: string, followingUid: string): Promise<boolean> {
  const followId = `${followerUid}_${followingUid}`;
  const snap = await getDoc(doc(db, 'follows', followId));
  return snap.exists();
}

export async function getFollowedUids(followerUid: string): Promise<string[]> {
  const q = query(collection(db, 'follows'), where('followerUid', '==', followerUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as Follow).followingUid);
}

// ===== likes =====
export async function likePost(postId: string, uid: string): Promise<void> {
  await setDoc(doc(db, 'likes', `${postId}_${uid}`), { postId, uid, createdAt: Date.now() });
  await updateDoc(doc(db, 'posts', postId), { likeCount: increment(1) });
}

export async function unlikePost(postId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'likes', `${postId}_${uid}`));
  await updateDoc(doc(db, 'posts', postId), { likeCount: increment(-1) });
}

// ===== live map =====
// realtime-listener für alle gerade fliegenden user (komplett public, kein follow nötig)
export function subscribeToLiveTracks(callback: (positions: LiveTrackPosition[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'liveTracks'), (snap) => {
    callback(snap.docs.map((d) => d.data() as LiveTrackPosition));
  });
}

// ===== profile =====
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ===== flights =====
export async function getFlight(flightId: string): Promise<Flight | null> {
  const snap = await getDoc(doc(db, 'flights', flightId));
  return snap.exists() ? (snap.data() as Flight) : null;
}

// ===== kommentare =====
export async function getComments(postId: string): Promise<Comment[]> {
  const q = query(collection(db, 'posts', postId, 'items'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Comment);
}

export async function addComment(postId: string, uid: string, text: string): Promise<void> {
  const commentId = `${uid}_${Date.now()}`;
  const comment: Comment = { id: commentId, uid, text: text.trim(), createdAt: Date.now() };
  await setDoc(doc(db, 'posts', postId, 'items', commentId), comment);
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
}
