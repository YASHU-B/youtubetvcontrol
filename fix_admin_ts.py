with open('app/admin/page.tsx', 'r') as f:
    content = f.read()

# Fix type errors by casting payload.new to any
content = content.replace('setData(payload.new.countdown ?? null);', 'setData((payload.new as any).countdown ?? null);')
content = content.replace('setLivePoll(payload.new.poll ?? null);', 'setLivePoll((payload.new as any).poll ?? null);')
content = content.replace('setLocalDedicationsEnabled(payload.new.dedicationsEnabled ?? true);', 'setLocalDedicationsEnabled((payload.new as any).dedicationsEnabled ?? true);')

# Fix missed updateDoc with single quotes
content = content.replace(
"""            await updateDoc(doc(db, 'channels', 'main'), {
                isLooping: true,
                isOfflineMode: true
            });""",
"""            await supabase.from("channels").update({
                isLooping: true,
            }).eq("id", "main");""")

with open('app/admin/page.tsx', 'w') as f:
    f.write(content)

