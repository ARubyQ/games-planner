import React, { useState, useEffect, useRef } from 'react'
import './TimezoneSelector.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function TimezoneSelector({ calendarId }) {
  const getUserTimezone = () => {
    const offset = -new Date().getTimezoneOffset() / 60
    if (offset < -4) return -4
    if (offset > 4) return 4
    return Math.round(offset)
  }

  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem(`timezone_${calendarId}`)
    return saved ? parseInt(saved) : getUserTimezone()
  })
  const [isOpen, setIsOpen] = useState(false)
  const timezoneRef = useRef(null)

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const response = await fetch(`${API_URL}/timezone/${calendarId}`)
        const data = await response.json()
        if (data.timezone !== undefined && data.timezone !== null) {
          setTimezone(data.timezone)
          localStorage.setItem(`timezone_${calendarId}`, data.timezone.toString())
        }
      } catch (error) {
        console.error('Ошибка загрузки часового пояса:', error)
      }
    }

    fetchTimezone()
  }, [calendarId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && timezoneRef.current && !timezoneRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleTimezoneChange = async (newTimezone) => {
    setTimezone(newTimezone)
    localStorage.setItem(`timezone_${calendarId}`, newTimezone.toString())
    setIsOpen(false)

    try {
      await fetch(`${API_URL}/timezone/${calendarId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone: newTimezone }),
      })
    } catch (error) {
      console.error('Ошибка сохранения часового пояса:', error)
    }
  }

  const timezoneOptions = []
  for (let i = -4; i <= 4; i++) {
    const sign = i >= 0 ? '+' : ''
    timezoneOptions.push({
      value: i,
      label: `UTC${sign}${i}`
    })
  }

  return (
    <div className="timezone-selector" ref={timezoneRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="timezone-toggle"
      >
        Часовой пояс: UTC{timezone >= 0 ? '+' : ''}{timezone}
      </button>
      {isOpen && (
        <div className="timezone-dropdown">
          {timezoneOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleTimezoneChange(option.value)}
              className={`timezone-option ${timezone === option.value ? 'active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TimezoneSelector

