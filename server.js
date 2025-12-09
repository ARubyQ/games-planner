const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3001

const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, 'data')
  : __dirname
const DATA_FILE = path.join(DATA_DIR, 'data.json')

if (process.env.NODE_ENV === 'production' && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

let allSelectedSlots = {}
let calendarTimezones = {}
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8')
    const parsed = JSON.parse(data)
    allSelectedSlots = parsed.slots || {}
    calendarTimezones = parsed.timezones || {}
    console.log('Данные загружены из файла')
  }
} catch (error) {
  console.error('Ошибка загрузки данных:', error)
  allSelectedSlots = {}
  calendarTimezones = {}
}

const saveData = () => {
  try {
    const dataToSave = {
      slots: allSelectedSlots,
      timezones: calendarTimezones
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8')
  } catch (error) {
    console.error('Ошибка сохранения данных:', error)
  }
}

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')))
}

app.get('/api/slots/:calendarId', (req, res) => {
  const { calendarId } = req.params
  const slots = allSelectedSlots[calendarId] || {}
  res.json(slots)
})

app.post('/api/slots/:calendarId', (req, res) => {
  const { calendarId } = req.params
  const { slotKey, nickname, action } = req.body
  
  if (!allSelectedSlots[calendarId]) {
    allSelectedSlots[calendarId] = {}
  }
  
  if (!allSelectedSlots[calendarId][slotKey]) {
    allSelectedSlots[calendarId][slotKey] = []
  }
  
  if (action === 'add') {
    if (!allSelectedSlots[calendarId][slotKey].includes(nickname)) {
      allSelectedSlots[calendarId][slotKey].push(nickname)
    }
  } else if (action === 'remove') {
    allSelectedSlots[calendarId][slotKey] = allSelectedSlots[calendarId][slotKey].filter(n => n !== nickname)
    
    if (allSelectedSlots[calendarId][slotKey].length === 0) {
      delete allSelectedSlots[calendarId][slotKey]
    }
  }
  
  saveData()
  
  res.json({ success: true, slots: allSelectedSlots[calendarId] })
})

app.get('/api/slots/:calendarId/all', (req, res) => {
  const { calendarId } = req.params
  const slots = allSelectedSlots[calendarId] || {}
  res.json(slots)
})

app.delete('/api/slots', (req, res) => {
  allSelectedSlots = {}
  res.json({ success: true })
})

app.get('/api/timezone/:calendarId', (req, res) => {
  const { calendarId } = req.params
  const timezone = calendarTimezones[calendarId] || null
  res.json({ timezone })
})

app.post('/api/timezone/:calendarId', (req, res) => {
  const { calendarId } = req.params
  const { timezone } = req.body
  
  if (timezone >= -4 && timezone <= 4) {
    calendarTimezones[calendarId] = timezone
    saveData()
    res.json({ success: true, timezone })
  } else {
    res.status(400).json({ success: false, error: 'Часовой пояс должен быть от -4 до +4' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`)
  console.log(`API доступен по адресу http://localhost:${PORT}/api`)
  if (process.env.NODE_ENV === 'production') {
    console.log(`Приложение доступно по адресу http://localhost:${PORT}`)
  }
})

