import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function cleanup() {
  const { data: subjects } = await supabase.from('subjects').select('id, name, topics(count)')
  
  for (const s of subjects) {
    if (s.topics[0].count === 0) {
      console.log(`Deleting empty subject: ${s.name} (${s.id})`)
      await supabase.from('subjects').delete().eq('id', s.id)
    }
  }

  // Check duplicate topics (since we saw count: 28 for physics but it should be 14)
  const { data: topics } = await supabase.from('topics').select('id, name, subject_id, subtopics(count)')
  
  // Group by name + subject
  const grouped = {}
  for (const t of topics) {
    const key = t.name + '::' + t.subject_id
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(t)
  }

  for (const key in grouped) {
    const dupes = grouped[key]
    if (dupes.length > 1) {
      // Keep the one with subtopics, delete others
      dupes.sort((a, b) => b.subtopics[0].count - a.subtopics[0].count)
      for (let i = 1; i < dupes.length; i++) {
        console.log(`Deleting duplicate topic: ${dupes[i].name} (${dupes[i].id})`)
        await supabase.from('topics').delete().eq('id', dupes[i].id)
      }
    }
  }

  console.log('Cleanup complete!')
}

cleanup().catch(console.error)
