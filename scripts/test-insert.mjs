import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const token = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjFiMzMxNzk2LTdkZWQtNGYyMS1iZjM4LWUxNTNmZDJkZWE1ZSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL25zcGx4Y2xqc3ZoaWZyemxsdWh3LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhMjEyOTQ0Ny1hMjZmLTRmYWYtOTg5OC02NTM4NjQzNzQzMDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc4MTA4ODk1LCJpYXQiOjE3NzgxMDUyOTUsImVtYWlsIjoidnZjZTI1Y3NlMDA3MUB2dmNlLmFjLmluIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InZ2Y2UyNWNzZTAwNzFAdnZjZS5hYy5pbiIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiUmFqYXQgU2luZ2giLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImEyMTI5NDQ3LWEyNmYtNGZhZi05ODk4LTY1Mzg2NDM3NDMwNiIsInRhcmdldF9leGFtIjoiSkVFIiwidGFyZ2V0X3llYXIiOjIwMjZ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc4MTA1Mjk1fV0sInNlc3Npb25faWQiOiI1YjM5ZWUzYy1lYWQ4LTQ4MmMtYjJlZi0yYTI3Y2E4OTIxNmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.HoPfj_WhPX56ftphza6YY4g3r3zECP56xwWjSkV0AzsDqVB-x8m5bKr8I40Ikf9VwK_QbzIrczwjWtaKFtx_JQ"

async function run() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/subjects?select=id,name`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  })
  const subjects = await res.json()
  const physicsId = subjects.find(s => s.name === 'Physics')?.id

  if (!physicsId) return console.log('No physics subject found')

  console.log('Inserting test topic...')
  const insertRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/topics`, {
    method: 'POST',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      subject_id: physicsId,
      name: 'Test Topic Auth',
      difficulty: 'EASY',
      weightage: 5,
      chapter_num: 99
    })
  })
  
  const text = await insertRes.text()
  console.log('Insert response:', insertRes.status, text)
}
run()
