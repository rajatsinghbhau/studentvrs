const token = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjFiMzMxNzk2LTdkZWQtNGYyMS1iZjM4LWUxNTNmZDJkZWE1ZSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL25zcGx4Y2xqc3ZoaWZyemxsdWh3LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhMjEyOTQ0Ny1hMjZmLTRmYWYtOTg5OC02NTM4NjQzNzQzMDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc4MTA4ODk1LCJpYXQiOjE3NzgxMDUyOTUsImVtYWlsIjoidnZjZTI1Y3NlMDA3MUB2dmNlLmFjLmluIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InZ2Y2UyNWNzZTAwNzFAdnZjZS5hYy5pbiIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiUmFqYXQgU2luZ2giLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImEyMTI5NDQ3LWEyNmYtNGZhZi05ODk4LTY1Mzg2NDM3NDMwNiIsInRhcmdldF9leGFtIjoiSkVFIiwidGFyZ2V0X3llYXIiOjIwMjZ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc4MTA1Mjk1fV0sInNlc3Npb25faWQiOiI1YjM5ZWUzYy1lYWQ4LTQ4MmMtYjJlZi0yYTI3Y2E4OTIxNmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.HoPfj_WhPX56ftphza6YY4g3r3zECP56xwWjSkV0AzsDqVB-x8m5bKr8I40Ikf9VwK_QbzIrczwjWtaKFtx_JQ"

async function testComplete() {
  // get a subtopic
  const r1 = await fetch('http://localhost:3000/api/subtopics?topicId=eddd072f-14ea-4616-a7df-b6d019473ce0', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const d1 = await r1.json()
  if (!d1.success || d1.data.subtopics.length === 0) {
    // try to get topics
    console.log('No subtopics found for that hardcoded ID, fetching dynamic topics...')
    const rt = await fetch('http://localhost:3000/api/subjects', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const dt = await rt.json()
    const subject = dt.data.subjects.find(s => s.name === 'Physics')
    if (!subject || subject.topics.length === 0) return console.log('No physics topics found')
    
    const topicId = subject.topics[0].id
    const r2 = await fetch(`http://localhost:3000/api/subtopics?topicId=${topicId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const d2 = await r2.json()
    console.log(d2)
    if (!d2.success || d2.data.subtopics.length === 0) return console.log('No subtopics found inside physics')
    
    const subtopic = d2.data.subtopics[0]
    console.log('Completing subtopic:', subtopic.name)
    
    const res = await fetch(`http://localhost:3000/api/subtopics/${subtopic.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        is_completed: true,
        topic_id: topicId,
        subject_id: subject.id
      })
    })
    
    console.log(res.status)
    const json = await res.json()
    console.log(json)
  }
}

testComplete().catch(console.error)
