const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const port = process.env.PORT || 8080;
const publicDirectory = path.join(__dirname, 'public');
const dataDirectory = path.join(__dirname, 'data');
const diaryFile = path.join(dataDirectory, 'diaries.json');

const weatherOptions = new Set(['sunny', 'cloudy', 'rainy', 'snowy', 'windy']);
const moodOptions = new Set(['happy', 'calm', 'ordinary', 'tired', 'sad']);

app.use(express.json({ limit: '10kb' }));
app.use(express.static(publicDirectory));

function readDiaries() {
  try {
    return JSON.parse(fs.readFileSync(diaryFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
}

app.get('/api/diaries', (req, res, next) => {
  try {
    const diaries = readDiaries().sort((first, second) => second.date.localeCompare(first.date));
    res.json(diaries);
  } catch (error) {
    next(error);
  }
});

app.post('/api/diaries', (req, res, next) => {
  const { date, weather, mood, content } = req.body ?? {};

  if (!isValidDate(date)) {
    return res.status(400).json({ error: '올바른 날짜를 선택해 주세요.' });
  }

  if (!weatherOptions.has(weather) || !moodOptions.has(mood)) {
    return res.status(400).json({ error: '날씨와 기분을 선택해 주세요.' });
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: '일기 내용을 입력해 주세요.' });
  }

  if (Array.from(content).length > 500) {
    return res.status(400).json({ error: '일기는 500자 이내로 작성해 주세요.' });
  }

  try {
    const diaries = readDiaries();
    if (diaries.some((diary) => diary.date === date)) {
      return res.status(409).json({ error: '이 날짜의 일기는 이미 작성했어요.' });
    }

    const diary = {
      date,
      weather,
      mood,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    fs.mkdirSync(dataDirectory, { recursive: true });
    const temporaryFile = `${diaryFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify([...diaries, diary], null, 2));
    fs.renameSync(temporaryFile, diaryFile);

    return res.status(201).json(diary);
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({ error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' });
});

app.listen(port, () => {
  console.log(`Diary app listening on http://localhost:${port}`);
});
