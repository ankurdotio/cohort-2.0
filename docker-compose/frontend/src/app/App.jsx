import { useState, useEffect, use } from 'react'
import axios from 'axios'

import './App.css'

function App() {

  const [ users, setUsers ] = useState([]);
  useEffect(() => {
    axios.get('/api/users')
    .then(response=>{
      setUsers(response.data)
    })
  }, []);

  return (
    <div className="app">
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}

export default App
