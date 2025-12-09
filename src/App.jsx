import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import NicknameInput from './components/NicknameInput'
import CalendarGrid from './components/CalendarGrid'
import TimezoneSelector from './components/TimezoneSelector'
import './App.css'

function CalendarPage() {
  const { calendarId = 'default' } = useParams()
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('nickname') || ''
  })
  const [isNicknameSet, setIsNicknameSet] = useState(() => {
    return !!localStorage.getItem('nickname')
  })

  const handleNicknameSubmit = (nick) => {
    setNickname(nick)
    setIsNicknameSet(true)
    localStorage.setItem('nickname', nick)
  }

  const handleLogout = () => {
    setNickname('')
    setIsNicknameSet(false)
    localStorage.removeItem('nickname')
  }

  if (!isNicknameSet) {
    return <NicknameInput onSubmit={handleNicknameSubmit} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Планировщик игр {calendarId !== 'default' && `- ${calendarId}`}</h1>
        <div className="user-info">
          <TimezoneSelector calendarId={calendarId} />
          <span className="nickname">Игрок: {nickname}</span>
          <button onClick={handleLogout} className="logout-btn">
            Выйти
          </button>
        </div>
      </header>
      <main className="app-main">
        <CalendarGrid nickname={nickname} calendarId={calendarId} />
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/:calendarId" element={<CalendarPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

