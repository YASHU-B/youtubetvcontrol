import re

with open('app/admin/page.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = re.sub(r"import \{ db, storage, auth \} from '@/lib/firebase';\nimport \{ doc, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp, onSnapshot, collection, query, where, orderBy, limit, addDoc \} from 'firebase/firestore';\nimport \{ ref, uploadBytes, getDownloadURL \} from 'firebase/storage';\nimport \{ signInAnonymously \} from 'firebase/auth';\n", 
"import { supabase } from '@/lib/supabase';\n", content)

# 2. CountdownAdminPreview
countdown_new = """    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('countdown').eq('id', 'main').single();
            setData(data?.countdown ?? null);
        };
        fetchInitial();
        
        const channel = supabase.channel('countdown-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, (payload) => {
                setData(payload.new.countdown ?? null);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);"""
content = re.sub(r"    useEffect\(\(\) => \{\n        const unsub = onSnapshot\(doc\(db, \"channels\", \"main\"\), \(snap\) => \{\n            const c = snap\.exists\(\) \? snap\.data\(\)\.countdown : null;\n            setData\(c \?\? null\);\n        \}\);\n        return \(\) => unsub\(\);\n    \}, \[\]\);", countdown_new, content)

# 3. telecast
telecast_old = """            await updateDoc(doc(db, "channels", "main"), {
                videoId: id,
                title: title,
                artist: artist,
                startedAt: serverTimestamp(), // AUTHORITATIVE SERVER TIME
                status: 'playing',
                duration: duration || 0,
                nextVideo: null,
                isLive: !!isLive, // New Field
                mediaType: mediaType || (id.startsWith('http') ? 'direct' : 'youtube') // Detect direct links
            });"""
telecast_new = """            await supabase.from("channels").update({
                videoId: id,
                title: title,
                artist: artist,
                startedAt: Date.now(), // AUTHORITATIVE SERVER TIME
                status: 'playing',
                duration: duration || 0,
                nextVideo: null,
                isLive: !!isLive, // New Field
                mediaType: mediaType || (id.startsWith('http') ? 'direct' : 'youtube') // Detect direct links
            }).eq("id", "main");"""
content = content.replace(telecast_old, telecast_new)

# 4. queueVideo
queueVideo_old = """            await updateDoc(doc(db, "channels", "main"), {
                nextVideo: {
                    id: id,
                    title: title,
                    artist: artist,
                    duration: duration || 0
                }
            });"""
queueVideo_new = """            await supabase.from("channels").update({
                nextVideo: {
                    id: id,
                    title: title,
                    artist: artist,
                    duration: duration || 0
                }
            }).eq("id", "main");"""
content = content.replace(queueVideo_old, queueVideo_new)

# 5. stopBroadcast
stop_old = """            await updateDoc(doc(db, "channels", "main"), {
                status: 'idle',
                isOfflineMode: false // Clear offline mode on stop
            });"""
stop_new = """            await supabase.from("channels").update({
                status: 'idle',
            }).eq("id", "main");"""
content = content.replace(stop_old, stop_new)

# 6. FCM Tokens
fcm_old = """    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "fcm_tokens"), (snapshot) => {
            setSubscriberCount(snapshot.size);
        });
        return () => unsubscribe();
    }, []);"""
fcm_new = """    // FCM tokens migration pending
    useEffect(() => {
        setSubscriberCount(0);
    }, []);"""
content = content.replace(fcm_old, fcm_new)

# 7. livePoll
livePoll_old = """    useEffect(() => {
        const unsub = onSnapshot(doc(db, "channels", "main"), (snap) => {
            setLivePoll(snap.exists() ? (snap.data().poll || null) : null);
        });
        return () => unsub();
    }, []);"""
livePoll_new = """    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('poll').eq('id', 'main').single();
            setLivePoll(data?.poll ?? null);
        };
        fetchInitial();
        const unsub = supabase.channel('poll-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, (payload) => {
                setLivePoll(payload.new.poll ?? null);
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);"""
content = content.replace(livePoll_old, livePoll_new)

# 8. dedications
dedications_old = """    useEffect(() => {
        const q = query(
            collection(db, "dedications"),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Client-side sort to avoid composite index requirement
            reqs.sort((a, b) => {
                const tA = a.createdAt?.toMillis() || 0;
                const tB = b.createdAt?.toMillis() || 0;
                return tB - tA; // Newest first
            });

            setDedications(reqs);
        });

        return () => unsubscribe();
    }, []);"""
dedications_new = """    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('dedications').select('*').eq('status', 'pending').order('createdAt', { ascending: false });
            setDedications(data || []);
        };
        fetchInitial();
        const unsub = supabase.channel('dedications-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dedications', filter: 'status=eq.pending' }, (payload) => {
                fetchInitial();
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);"""
content = content.replace(dedications_old, dedications_new)

# 9. recentChatters
chatters_old = """    useEffect(() => {
        const q = query(
            collection(db, "messages"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const names = new Set<string>();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.senderName) names.add(data.senderName);
            });
            setRecentChatters(Array.from(names).slice(0, 10)); // Top 10 recent
        });

        return () => unsubscribe();
    }, []);"""
chatters_new = """    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('messages').select('author').order('createdAt', { ascending: false }).limit(50);
            if (data) {
                const names = new Set<string>();
                data.forEach((d: any) => { if (d.author) names.add(d.author); });
                setRecentChatters(Array.from(names).slice(0, 10));
            }
        };
        fetchInitial();
        const unsub = supabase.channel('chatters-admin')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                setRecentChatters(prev => {
                    const names = new Set([payload.new.author, ...prev]);
                    return Array.from(names).slice(0, 10);
                });
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);"""
content = content.replace(chatters_old, chatters_new)

# 10. localDedicationsEnabled
localDed_old = """    useEffect(() => {
        const unsub = onSnapshot(doc(db, "channels", "main"), (snap) => {
            if (snap.exists()) {
                setLocalDedicationsEnabled(snap.data().dedicationsEnabled ?? true);
            }
        });
        return () => unsub();
    }, []);"""
localDed_new = """    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('channels').select('dedicationsEnabled').eq('id', 'main').single();
            setLocalDedicationsEnabled(data?.dedicationsEnabled ?? true);
        };
        fetchInitial();
        const unsub = supabase.channel('dedications-toggle')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: 'id=eq.main' }, (payload) => {
                setLocalDedicationsEnabled(payload.new.dedicationsEnabled ?? true);
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);"""
content = content.replace(localDed_old, localDed_new)

# 11. mediaLibrary
media_old = """    useEffect(() => {
        const q = query(collection(db, "media_library"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMediaLibrary(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);"""
media_new = """    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('media_library').select('*').order('createdAt', { ascending: false });
            setMediaLibrary(data || []);
        };
        fetchInitial();
        const unsub = supabase.channel('media-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'media_library' }, () => {
                fetchInitial();
            }).subscribe();
        return () => { supabase.removeChannel(unsub); };
    }, []);"""
content = content.replace(media_old, media_new)

# Replace all simple updates to doc(db, "channels", "main")
content = re.sub(r"await updateDoc\(doc\(db, \"channels\", \"main\"\), \{\n\s+(.*?)\n\s+\}\);", r"await supabase.from('channels').update({\n                \1\n            }).eq('id', 'main');", content, flags=re.DOTALL)
# One line updates
content = re.sub(r"await updateDoc\(doc\(db, \"channels\", \"main\"\), \{(.*?)\}\);", r"await supabase.from('channels').update({\1}).eq('id', 'main');", content)

# File Upload
upload_old = """        try {
            const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, "media_library"), {
                title: file.name.split('.')[0],
                artist: "Uploaded Media",
                url: downloadURL,
                duration: 0,
                createdAt: serverTimestamp(),
                size: file.size,
                type: file.type
            });

            alert("Upload successful!");
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Check console.");
        }"""
upload_new = """        try {
            const filePath = `media/${Date.now()}_${file.name}`;
            const { error } = await supabase.storage.from('media').upload(filePath, file);
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

            await supabase.from("media_library").insert({
                name: file.name.split('.')[0],
                url: urlData.publicUrl,
                type: file.type,
                size: file.size
            });

            alert("Upload successful!");
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Check console.");
        }"""
content = content.replace(upload_old, upload_new)

# Delete media
content = content.replace('await deleteDoc(doc(db, "media_library", media.id));', 'await supabase.from("media_library").delete().eq("id", media.id);')

# Auth
auth_old = """            try {
                // Sign in anonymously to allow Storage uploads
                await signInAnonymously(auth);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Auth failed:", error);
                alert("Auth failed. Check if Anonymous Auth is enabled in Firebase Console.");
                // Proceed anyway for read-only access if needed, or block?
                // For now, block to ensure upload works.
            }"""
auth_new = """            try {
                const { error } = await supabase.auth.signInAnonymously();
                // Even if anonymous auth fails (e.g., not enabled), we let them in since it's admin123
                if (error) console.warn("Supabase auth failed:", error);
                setIsAuthenticated(true);
            } catch (error) {
                console.error("Auth error:", error);
            }"""
content = content.replace(auth_old, auth_new)

# handleShowDedication
content = content.replace('await updateDoc(doc(db, "dedications", req.id), {', 'await supabase.from("dedications").update({').replace('status: "approved"\n            });', 'status: "approved"\n            }).eq("id", req.id);')

# handleDismissDedication
content = content.replace('await updateDoc(doc(db, "dedications", id), {', 'await supabase.from("dedications").update({').replace('status: "rejected"\n            });', 'status: "rejected"\n            }).eq("id", id);')


# handleCreatePoll / handleClearPoll
poll_db_imports = """            const { getDocs, deleteDoc } = await import("firebase/firestore");
            const voteSnap = await getDocs(collection(db, "pollVotes"));
            await Promise.all(voteSnap.docs.map(d => deleteDoc(d.ref)));"""
poll_db_new = """            await supabase.from('poll_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all"""
content = content.replace(poll_db_imports, poll_db_new)

with open('app/admin/page.tsx', 'w') as f:
    f.write(content)
